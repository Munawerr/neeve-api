import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
// Update imports to use Result instead of TestAttempt and Enrollment
import { User } from '../users/schemas/user.schema';
import { Test } from '../tests/schemas/test.schema';
import { Result, ResultStatus } from '../results/schemas/result.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Test.name) private testModel: Model<Test>,
    @InjectModel(Result.name) private resultModel: Model<Result>,
    @InjectModel(User.name) private userModel: Model<User>,
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
    const query: any = {};

    // Filter by institute if provided
    if (instituteId) {
      query.institute = instituteId;
    }

    const courses = await this.courseModel
      .find(query)
      .select('_id title')
      .sort({ title: 1 })
      .lean()
      .exec();

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

  // Dashboard Analytics Methods

  async countAllCourses(): Promise<number> {
    return await this.courseModel.countDocuments({ status: 'active' });
  }

  async countAllTests(): Promise<number> {
    return await this.testModel.countDocuments({ status: 'active' });
  }

  async countAllTestAttempts(): Promise<number> {
    return await this.resultModel.countDocuments();
  }

  async getMostPopularCourses(limit: number): Promise<any[]> {
    const courses = await this.courseModel.find({ status: 'active' }).lean();
    const coursesWithAttempts: any[] = [];

    for (const course of courses) {
      // Find tests belonging to this course
      const tests = await this.testModel
        .find({
          course: course._id,
          status: 'active',
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
    const results: any[] = [];
    const date = new Date();

    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(date.getDate() - i);

      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      const count = await this.resultModel.countDocuments({
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

  async getMostPopularTests(limit: number): Promise<any[]> {
    const testAttempts = await this.resultModel.aggregate([
      { $match: { status: ResultStatus.FINISHED } },
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

  async getAverageTestScores(): Promise<any[]> {
    const tests = await this.testModel
      .find({ status: 'active' })
      .populate('subject')
      .lean();

    const result: any[] = [];

    for (const test of tests) {
      if (!test) {
        continue; // Skip if test is not found
      }
      const attempts = await this.resultModel.find({
        test: test._id,
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

    return result;
  }

  // Institute-specific analytics methods

  async countInstituteCoursesById(instituteId: string): Promise<number> {
    return await this.courseModel.countDocuments({
      institute: instituteId,
      status: 'active',
    });
  }

  async getInstituteTests(instituteId: string): Promise<any[]> {
    const courseIds = await this.courseModel
      .find({
        institute: instituteId,
        status: 'active',
      })
      .select('_id');

    return await this.testModel
      .find({
        course: { $in: courseIds.map((course) => course._id) },
        status: 'active',
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
    const courses = await this.courseModel
      .find({
        institute: instituteId,
        status: 'active',
      })
      .lean();

    const coursesWithAttempts: any[] = [];

    for (const course of courses) {
      // Find tests belonging to this course
      const tests = await this.testModel
        .find({
          course: course._id,
          status: 'active',
        })
        .select('_id');

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
    const courseIds = await this.courseModel
      .find({
        institute: instituteId,
        status: 'active',
      })
      .select('_id');

    const tests = await this.testModel
      .find({
        course: { $in: courseIds.map((course) => course._id) },
        status: 'active',
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
}
