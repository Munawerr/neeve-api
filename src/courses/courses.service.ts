import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Course } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
// Update imports to use Result instead of TestAttempt and Enrollment
import { User } from '../users/schemas/user.schema';
import { Test } from '../tests/schemas/test.schema';
import { Result, ResultStatus } from '../results/schemas/result.schema';
import { Topic } from 'src/topics/schemas/topic.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Test.name) private testModel: Model<Test>,
    @InjectModel(Result.name) private resultModel: Model<Result>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(User.name) private topicModel: Model<Topic>,
  ) {}

  create(createCourseDto: CreateCourseDto): Promise<Course> {
    const createdCourse = new this.courseModel(createCourseDto);
    return createdCourse.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ courses: Course[]; total: number }> {
    const filter = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const courses = await this.courseModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.courseModel.countDocuments(filter);
    return { courses, total };
  }

  async findAllForDropdown(): Promise<Course[]> {
    return this.courseModel.find({}, 'title').exec();
  }

  async getAllCoursesForDropdown(instituteId?: string): Promise<any[]> {
    const courses = await this.getInstituteCourses(instituteId);

    return courses.map((course) => ({
      _id: course._id,
      title: course.title,
      value: course._id,
      label: course.title,
    }));
  }

  findOne(id: string): Promise<Course | null> {
    return this.courseModel.findById(id).exec();
  }

  findByIds(ids: string[]): Promise<Course[]> {
    return this.courseModel.find({ _id: { $in: ids } }).exec();
  }

  update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course | null> {
    return this.courseModel
      .findByIdAndUpdate(id, updateCourseDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Course | null> {
    return this.courseModel.findByIdAndDelete(id).exec();
  }

  async getInstituteCourses(instituteId?: string): Promise<Course[]> {
    const user = await this.userModel
      .findById(instituteId)
      .populate({
        path: 'packages',
        model: 'Package',
        populate: [{ path: 'course', model: 'Course' }],
      })
      .exec();

    return user
      ? user.packages.flatMap((packageItem: any) => packageItem.course)
      : [];
  }

  // Dashboard Analytics Methods

  async countAllCourses(): Promise<number> {
    return await this.courseModel.countDocuments();
  }

  async countAllTests(): Promise<number> {
    return await this.testModel.countDocuments();
  }

  async countAllTestAttempts(): Promise<number> {
    return await this.resultModel.countDocuments({
      status: ResultStatus.FINISHED,
    });
  }

  async getMostPopularCourses(limit: number): Promise<any[]> {
    const courses = await this.courseModel.find().lean();
    const coursesWithAttempts: any[] = [];

    for (const course of courses) {
      // Find tests belonging to this course
      const tests = await this.testModel
        .find({
          course: course._id,
        })
        .select('_id');

      const testIds = tests.map((test) => test._id);

      // Count results (attempts) for these tests
      const attemptCount = await this.resultModel.countDocuments({
        test: { $in: testIds },
      });

      coursesWithAttempts.push({
        id: course._id,
        name: course.title,
        attemptCount,
      });
    }

    return coursesWithAttempts
      .sort((a, b) => b.attemptCount - a.attemptCount)
      .slice(0, limit);
  }

  async getTestsCompletedByDay(
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attempts = await this.resultModel.aggregate([
      {
        $match: {
          status: ResultStatus.FINISHED,
          finishedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return attempts.map((attempt) => ({
      date: attempt._id,
      count: attempt.count,
    }));
  }

  async getMostPopularTests(limit: number): Promise<any[]> {
    return await this.testModel.aggregate([
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'test',
          as: 'attempts',
        },
      },
      {
        $project: {
          title: 1,
          attempts: {
            $size: {
              $filter: {
                input: '$attempts',
                as: 'attempt',
                cond: { $eq: ['$$attempt.status', ResultStatus.FINISHED] },
              },
            },
          },
        },
      },
      {
        $sort: { attempts: -1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getAverageTestScores(): Promise<any> {
    const result = await this.resultModel.aggregate([
      {
        $match: {
          status: ResultStatus.FINISHED,
          'marksSummary.obtainedMarks': { $exists: true },
          'marksSummary.totalMarks': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          overall: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    '$marksSummary.obtainedMarks',
                    '$marksSummary.totalMarks',
                  ],
                },
                100,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { overall: 0, total: 0 };
    }

    return {
      overall: Math.round(result[0].overall || 0),
      total: result[0].total,
    };
  }

  // Institute-specific analytics methods

  async countInstituteCoursesById(instituteId: string): Promise<number> {
    return (await this.getInstituteCourses(instituteId)).length;
  }

  async getInstituteTests(instituteId: string): Promise<any[]> {
    const courseIds = await this.getInstituteCourses(instituteId);

    return await this.testModel
      .find({
        course: { $in: courseIds.map((course) => course._id) },
      })
      .populate('subject');
  }

  async countInstituteTestAttempts(instituteId: string): Promise<number> {
    // Count results where institute field matches the instituteId
    return await this.resultModel.countDocuments({
      institute: instituteId,
    });
  }

  async getInstituteTestsCompletedByDay(
    instituteId: string,
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const results: any[] = [];
    const date = new Date();

    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(date.getDate() - i);

      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      const count = await this.resultModel.countDocuments({
        institute: instituteId,
        finishedAt: { $gte: startOfDay, $lte: endOfDay },
        status: ResultStatus.FINISHED,
      });

      results.unshift({
        date: startOfDay.toISOString().split('T')[0],
        count,
      });
    }

    return results;
  }

  async getMostPopularInstituteTests(
    instituteId: string,
    limit: number,
  ): Promise<any[]> {
    const testAttempts = await this.resultModel.aggregate([
      {
        $match: {
          institute: { $eq: instituteId },
          status: ResultStatus.FINISHED,
        },
      },
      { $group: { _id: '$test', attemptCount: { $sum: 1 } } },
      { $sort: { attemptCount: -1 } },
      { $limit: limit },
    ]);

    const result: any[] = [];

    for (const item of testAttempts) {
      const test = await this.testModel
        .findById(item._id)
        .populate('subject')
        .lean();

      if (test) {
        result.push({
          test: {
            id: test._id,
            name: test.title,
            // @ts-ignore
            subject: test.subject?.title || 'Unknown',
          },
          attemptCount: item.attemptCount,
        });
      }
    }

    return result;
  }

  async getInstituteTestScoreDistribution(instituteId: string): Promise<{
    ranges: Array<{ range: string; count: number }>;
  }> {
    // Get all results for this institute
    const results = await this.resultModel
      .find({
        institute: instituteId,
        status: ResultStatus.FINISHED,
      })
      .select('marksSummary');

    // Define score ranges
    const ranges = [
      { min: 0, max: 20, label: '0-20%' },
      { min: 21, max: 40, label: '21-40%' },
      { min: 41, max: 60, label: '41-60%' },
      { min: 61, max: 80, label: '61-80%' },
      { min: 81, max: 100, label: '81-100%' },
    ];

    // Initialize distribution
    const distribution = ranges.map((range) => ({
      range: range.label,
      count: 0,
    }));

    // Count results in each range
    for (const result of results) {
      if (result.marksSummary) {
        const totalMarks = result.marksSummary.totalMarks;
        const obtainedMarks = result.marksSummary.obtainedMarks;

        // Calculate percentage score
        const scorePercent =
          totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

        // Find which range this score falls into
        for (let i = 0; i < ranges.length; i++) {
          if (scorePercent >= ranges[i].min && scorePercent <= ranges[i].max) {
            distribution[i].count++;
            break;
          }
        }
      }
    }

    return { ranges: distribution };
  }

  async getMostPopularInstituteCourses(
    instituteId: string,
    limit: number,
  ): Promise<any[]> {
    // Find courses for this institute
    const courses = await this.getInstituteCourses(instituteId);

    const coursesWithAttempts: any[] = [];

    for (const course of courses) {
      // Find tests belonging to this course

      const user: any = await this.userModel
        .findById(instituteId)
        .populate('packages')
        .exec();

      let tests: any[] = [];

      let packageId: any = null;
      const reportCourseId = course._id as string;
      if (user) {
        for (let x = 0; x < user.packages.length; x++) {
          const courseId = user.packages[x].course.toString();
          if (courseId == reportCourseId) {
            packageId = user.toObject().packages[x]._id.toString();
            break;
          }
        }

        const topics = await this.topicModel
          .find({ package: packageId, isParent: true })
          .populate({
            path: 'tests',
            model: 'Test',
            populate: [
              {
                path: 'subject',
                model: 'Subject',
              },
            ],
          })
          .exec();

        tests = topics.map((topic) => topic.tests).flat();
      }

      const testIds = tests.map((test) => test._id);

      // Count results (attempts) for these tests
      const attemptCount = await this.resultModel.countDocuments({
        test: { $in: testIds },
        institute: instituteId,
      });

      coursesWithAttempts.push({
        id: course._id,
        name: course.title,
        attemptCount,
      });
    }

    return coursesWithAttempts
      .sort((a, b) => b.attemptCount - a.attemptCount)
      .slice(0, limit);
  }

  async getInstituteAverageTestScores(instituteId: string): Promise<any[]> {
    // Get all tests available for this institute
    const courseIds = await this.getInstituteCourses(instituteId);

    const tests = await this.testModel
      .find({
        course: { $in: courseIds.map((course) => course._id) },
      })
      .populate('subject')
      .lean();

    const result: any[] = [];

    for (const test of tests) {
      if (!test) {
        continue; // Skip if test is not found
      }
      const attempts = await this.resultModel.find({
        test: test._id,
        institute: instituteId,
        status: ResultStatus.FINISHED,
      });

      if (attempts.length > 0) {
        // Calculate average score using marksSummary
        const totalScore = attempts.reduce((acc, curr) => {
          const marksSummary = curr.marksSummary;
          return acc + (marksSummary ? marksSummary.obtainedMarks : 0);
        }, 0);

        const averageScore = totalScore / attempts.length;

        result.push({
          test: {
            id: test._id,
            name: test.title,
            // @ts-ignore
            subject: test.subject?.title || 'Unknown',
          },
          averageScore: parseFloat(averageScore.toFixed(2)),
          attemptCount: attempts.length,
        });
      }
    }

    return result.sort((a, b) => b.attemptCount - a.attemptCount);
  }

  async getCoursesOverview(): Promise<any[]> {
    return this.courseModel.aggregate([
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: 'course',
          as: 'subjects',
        },
      },
      {
        $project: {
          title: 1,
          code: 1,
          subjectCount: { $size: '$subjects' },
          topicCount: {
            $reduce: {
              input: '$subjects',
              initialValue: 0,
              in: { $add: ['$$value', { $size: '$$this.topics' }] },
            },
          },
        },
      },
    ]);
  }

  async getCoursePerformanceStats(courseId: string): Promise<any> {
    const stats = await this.courseModel.aggregate([
      {
        $match: { _id: new MongooseSchema.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: 'course',
          as: 'subjects',
        },
      },
      {
        $lookup: {
          from: 'results',
          localField: 'subjects._id',
          foreignField: 'subject',
          as: 'results',
        },
      },
      {
        $project: {
          averageScore: {
            $avg: '$results.marksSummary.averageMarks',
          },
          completionRate: {
            $multiply: [
              {
                $divide: [{ $size: '$results' }, { $size: '$subjects' }],
              },
              100,
            ],
          },
          studentCount: {
            $size: {
              $setUnion: '$results.student',
            },
          },
        },
      },
    ]);

    return stats[0];
  }

  async getCourseEnrollmentTrends(months: number): Promise<any[]> {
    return this.courseModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'courses',
          as: 'enrollments',
        },
      },
      {
        $unwind: '$enrollments',
      },
      {
        $match: {
          'enrollments.createdAt': {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
          },
        },
      },
      {
        $group: {
          _id: {
            courseId: '$_id',
            year: { $year: '$enrollments.createdAt' },
            month: { $month: '$enrollments.createdAt' },
          },
          courseName: { $first: '$title' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
      {
        $project: {
          _id: 0,
          courseId: '$_id.courseId',
          courseName: 1,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' },
            ],
          },
          count: 1,
        },
      },
    ]);
  }

  async getTopPerformingCourses(limit: number): Promise<any[]> {
    return this.courseModel.aggregate([
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: 'course',
          as: 'subjects',
        },
      },
      {
        $lookup: {
          from: 'results',
          localField: 'subjects._id',
          foreignField: 'subject',
          as: 'results',
        },
      },
      {
        $project: {
          title: 1,
          performance: {
            $avg: '$results.marksSummary.averageMarks',
          },
          studentCount: {
            $size: {
              $setUnion: '$results.student',
            },
          },
        },
      },
      {
        $sort: { performance: -1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getInstituteDifficultTopics(
    instituteId: string,
    limit: number = 5,
  ): Promise<any[]> {
    return this.courseModel.aggregate([
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: 'course',
          as: 'subjects',
        },
      },
      {
        $unwind: '$subjects',
      },
      {
        $lookup: {
          from: 'topics',
          localField: 'subjects._id',
          foreignField: 'subject',
          as: 'topics',
        },
      },
      {
        $unwind: '$topics',
      },
      {
        $lookup: {
          from: 'results',
          localField: 'topics._id',
          foreignField: 'topic',
          as: 'results',
        },
      },
      {
        $project: {
          topicId: '$topics._id',
          topicName: '$topics.title',
          subjectName: '$subjects.title',
          averageScore: {
            $avg: '$results.marksSummary.averageMarks',
          },
          attemptCount: { $size: '$results' },
        },
      },
      {
        $match: {
          attemptCount: { $gt: 0 },
        },
      },
      {
        $sort: { averageScore: 1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getInstituteSubjectPerformance(instituteId: string): Promise<any[]> {
    return this.courseModel.aggregate([
      {
        $match: { institute: new MongooseSchema.Types.ObjectId(instituteId) },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: 'course',
          as: 'subjects',
        },
      },
      {
        $unwind: '$subjects',
      },
      {
        $lookup: {
          from: 'results',
          localField: 'subjects._id',
          foreignField: 'subject',
          as: 'results',
        },
      },
      {
        $project: {
          subjectId: '$subjects._id',
          subjectName: '$subjects.title',
          courseName: '$title',
          performance: {
            averageScore: { $avg: '$results.marksSummary.averageMarks' },
            totalAttempts: { $size: '$results' },
            completionRate: {
              $multiply: [
                {
                  $divide: [
                    {
                      $size: {
                        $filter: {
                          input: '$results',
                          as: 'result',
                          cond: { $eq: ['$$result.status', 'finished'] },
                        },
                      },
                    },
                    { $size: '$results' },
                  ],
                },
                100,
              ],
            },
          },
        },
      },
      {
        $sort: { 'performance.averageScore': -1 },
      },
    ]);
  }

  async getInstituteStudentPerformanceTrend(
    instituteId: string,
    days: number = 30,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.courseModel.aggregate([
      {
        $lookup: {
          from: 'results',
          let: { courseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$institute',
                        new MongooseSchema.Types.ObjectId(instituteId),
                      ],
                    },
                    { $gte: ['$finishedAt', startDate] },
                  ],
                },
              },
            },
          ],
          as: 'results',
        },
      },
      {
        $unwind: '$results',
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$results.finishedAt',
              },
            },
          },
          averageScore: { $avg: '$results.marksSummary.averageMarks' },
          totalAttempts: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          averageScore: { $round: ['$averageScore', 2] },
          totalAttempts: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);
  }
}
