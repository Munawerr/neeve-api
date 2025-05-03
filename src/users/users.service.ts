import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose'; // Import Mongoose Schema
import { Role } from './../roles/schemas/role.schema';
import {
  Result,
  ResultStatus,
  TestType,
} from './../results/schemas/result.schema'; // Import Result schema
import { Package } from 'src/packages/schemas/package.schema';
import { LoginHistory } from '../auth/schemas/login-history.schema'; // Import LoginHistory model

import { User } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto'; // Import DTO for creating institute user
import * as bcrypt from 'bcrypt'; // Import bcrypt for password hashing
import { CreateStudentUserDto } from './dto/create-student-user.dto';
import { S3Service } from '../s3/s3.service';
import { UpdateInstituteUserDto } from './dto/update-institute-user.dto';
import { UpdateStudentUserDto } from './dto/update-student-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Result.name) private resultModel: Model<Result>, // Inject Result model
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    @InjectModel(LoginHistory.name)
    private readonly loginHistoryModel: Model<LoginHistory>, // Inject LoginHistory model
    private readonly s3Service: S3Service, // Inject S3 service
  ) {}

  async findOne(
    id: string,
    populatePkGs = false,
  ): Promise<User | undefined | null> {
    if (populatePkGs) {
      return this.userModel
        .findById(id)
        .populate({
          path: 'packages',
          populate: {
            path: 'subjects',
          },
        })
        .populate('role')
        .populate('institute')
        .exec();
    }
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email })
      .populate('role')
      .populate('packages')
      .populate('institute')
      .exec();
  }

  async findByTokenAndOTP(
    verificationToken: string,
    verificationOtp: string,
  ): Promise<User | null> {
    return this.userModel
      .findOne({ verificationToken, verificationOtp })
      .exec();
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateProfileDto, { new: true })
      .exec();
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { imageUrl }, { new: true })
      .exec();
  }

  async updateCoverUrl(id: string, coverUrl: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { coverUrl }, { new: true })
      .exec();
  }

  async updateBio(id: string, bio: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, { bio }, { new: true }).exec();
  }

  async createInstituteUser(
    createInstituteUserDto: CreateInstituteUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const { password, ...userData } = createInstituteUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUrl = file ? await this.s3Service.uploadFile(file) : null;
    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      role: await this.getInstituteRoleId(), // Get institute role ID
      imageUrl,
    });
    return newUser.save();
  }

  async updateInstituteUser(
    id: string,
    UpdateInstituteUserDto: UpdateInstituteUserDto,
    file?: Express.Multer.File,
  ): Promise<User | null> {
    const imageUrl = file ? await this.s3Service.uploadFile(file) : null;
    const updateData = imageUrl
      ? { ...UpdateInstituteUserDto, imageUrl }
      : UpdateInstituteUserDto;
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async getInstituteUser(
    id: string,
    populatePkgs = false,
  ): Promise<User | null> {
    if (populatePkgs) {
      return this.userModel
        .findById(id)
        .populate({
          path: 'packages',
          populate: {
            path: 'subjects',
          },
        })
        .populate('role')
        .populate('institute')
        .exec();
    } else {
      return this.userModel.findById(id).populate('role').exec();
    }
  }

  async getAllInstituteUsers(
    page: number,
    limit: number,
    search: string,
  ): Promise<{ users: User[]; total: number }> {
    const filter = {
      role: await this.getInstituteRoleId(),
      ...(search && {
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }),
    };
    const users = await this.userModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('packages')
      .exec();
    const total = await this.userModel.countDocuments(filter);
    return { users, total };
  }

  async deleteInstituteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async getInstituteRoleId(): Promise<MongooseSchema.Types.ObjectId | unknown> {
    const instituteRole = await this.roleModel.findOne({ slug: 'institute' });
    if (!instituteRole) {
      throw new Error('Institute role not found');
    }
    return instituteRole._id;
  }

  async createStudentUser(
    createStudentUserDto: CreateStudentUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const { password, ...userData } = createStudentUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUrl = file ? await this.s3Service.uploadFile(file) : null;

    const institute = await this.userModel.findById(userData.institute);

    if (!institute) {
      throw new Error('Institute not found');
    }

    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      role: await this.getStudentRoleId(),
      institute: institute._id,
      imageUrl,
    });
    return newUser.save();
  }

  async updateStudentUser(
    id: string,
    UpdateStudentUserDto: UpdateStudentUserDto,
    file?: Express.Multer.File,
  ): Promise<User | null> {
    const imageUrl = file ? await this.s3Service.uploadFile(file) : null;
    const updateData = imageUrl
      ? { ...UpdateStudentUserDto, imageUrl }
      : UpdateStudentUserDto;
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async getStudentUser(id: string): Promise<User | null> {
    return this.userModel.findById(id).populate('packages').exec();
  }

  async getAllStudentUsers(
    page: number,
    limit: number,
    search: string,
    institute?: string,
  ): Promise<{ users: User[]; total: number }> {
    const filter = {
      role: await this.getStudentRoleId(),
      ...(search && {
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }),
      ...(institute && { institute }),
    };
    const users = await this.userModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('packages')
      .exec();
    const total = await this.userModel.countDocuments(filter);
    return { users, total };
  }

  async deleteStudentUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async getStudentRoleId(): Promise<MongooseSchema.Types.ObjectId | unknown> {
    const studentRole = await this.roleModel.findOne({ slug: 'student' });
    if (!studentRole) {
      throw new Error('Student role not found');
    }
    return studentRole._id;
  }

  async getUserAnalytics(user: User): Promise<any> {
    const _user = user.toObject();
    if (_user.role && _user.role.slug === 'institute') {
      const studentRole = await this.roleModel.findOne({ slug: 'student' });
      const studentCount = await this.userModel.countDocuments({
        institute: user._id,
        role: studentRole?._id,
      });
      const testResultsCount = await this.resultModel.countDocuments({
        institute: user._id,
      });
      return { studentCount, testResultsCount };
    } else if (_user.role && _user.role.slug === 'student') {
      const testResults = await this.resultModel
        .find({
          student: user._id,
          status: ResultStatus.FINISHED,
        })
        .populate('test')
        .exec();

      // Get unique test results (best attempt for each test)
      const uniqueResults = testResults.reduce((acc, result: any) => {
        const testId = result.test._id.toString();
        if (
          !acc[testId] ||
          acc[testId].marksSummary.obtainedMarks <
            result.marksSummary.obtainedMarks
        ) {
          acc[testId] = result;
        }
        return acc;
      }, {});

      const uniqueResultsArray: any[] = Object.values(uniqueResults);
      const testsTaken = uniqueResultsArray.length;

      // Calculate total marks considering skippable questions
      const totalScore: number = uniqueResultsArray.reduce(
        (sum: number, result: any) => {
          const skipableQuestionsCount =
            result.test.skipableQuestionsCount || 0;
          const effectiveQuestionCount =
            result.numOfQuestions - skipableQuestionsCount;
          return sum + effectiveQuestionCount * result.marksPerQuestion;
        },
        0,
      );

      const acquiredScore: number = uniqueResultsArray.reduce(
        (sum: number, result: any) => sum + result.marksSummary.obtainedMarks,
        0,
      );

      const percentage = Math.max(0, (acquiredScore / totalScore) * 100);

      // Get all other students' results
      const allStudentResults = await this.resultModel
        .find({
          status: ResultStatus.FINISHED,
          student: { $ne: user._id },
        })
        .populate('test')
        .exec();

      // Group results by student
      const studentResults = allStudentResults.reduce((acc, result: any) => {
        const studentId = result.student.toString();
        if (!acc[studentId]) {
          acc[studentId] = {};
        }
        const testId = result.test._id.toString();
        if (
          !acc[studentId][testId] ||
          acc[studentId][testId].marksSummary.obtainedMarks <
            result.marksSummary.obtainedMarks
        ) {
          acc[studentId][testId] = result;
        }
        return acc;
      }, {});

      // Calculate average score for each student
      const studentScores = Object.values(studentResults).map((tests: any) => {
        const testArray: any[] = Object.values(tests);
        const total = testArray.reduce((sum: number, result: any) => {
          const skipableQuestionsCount =
            result.test.skipableQuestionsCount || 0;
          const effectiveQuestionCount =
            result.numOfQuestions - skipableQuestionsCount;
          return sum + effectiveQuestionCount * result.marksPerQuestion;
        }, 0);

        const obtained = testArray.reduce(
          (sum: number, result: any) => sum + result.marksSummary.obtainedMarks,
          0,
        );
        return (obtained / total) * 100;
      });

      // Add current student's score
      studentScores.push(percentage);

      // Sort scores in descending order (highest first)
      studentScores.sort((a, b) => b - a);

      // Find position of current score (0-based index)
      const rank =
        studentScores.findIndex(
          (score) => Math.abs(score - percentage) < 0.001,
        ) + 1;
      const totalStudents = studentScores.length;

      // Calculate percentile (rank based)
      const percentile = Math.round((rank / totalStudents) * 100);

      const avgTimePerQuestion =
        uniqueResultsArray.reduce(
          (sum, result) =>
            result.finishedAt && result.startedAt
              ? sum +
                (result.finishedAt.getTime() - result.startedAt.getTime()) /
                  result.numOfQuestions
              : sum,
          0,
        ) /
        testsTaken /
        1000; // Division by 1000 converts milliseconds to seconds

      const correctAnswers = uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.correctAnswers,
        0,
      );

      const incorrectAnswers = uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.incorrectAnswers,
        0,
      );

      const skippedQuestions = uniqueResultsArray.reduce(
        (sum, result) => sum + (result.marksSummary.skippedQuestions || 0),
        0,
      );

      const totalAnswersInclSkipped =
        correctAnswers + incorrectAnswers + skippedQuestions;
      const totalAnswers = correctAnswers + incorrectAnswers;

      // Calculate success chance based on multiple factors
      const successChance = Math.min(
        100,
        Math.max(
          0,
          (correctAnswers / totalAnswers) * 40 + // Weight for correct answer ratio
            percentage * 0.3 + // Weight for overall score
            Math.max(0, 100 - percentile) * 0.3, // Weight for class performance
        ),
      );

      // Get login history for study time analytics
      const studyTimeData = await this.loginHistoryModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(user._id as string),
            loginTime: {
              $gte: new Date(new Date().getFullYear(), 0, 1),
              $lte: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
            },
          },
        },
        {
          $group: {
            _id: {
              month: { $subtract: [{ $month: '$loginTime' }, 1] }, // Convert to 0-based month
              day: { $dayOfMonth: '$loginTime' },
              dayOfWeek: {
                $subtract: [
                  {
                    $cond: [
                      { $eq: [{ $dayOfWeek: '$loginTime' }, 1] },
                      7,
                      { $dayOfWeek: '$loginTime' },
                    ],
                  },
                  1,
                ],
              },
            },
            loginCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            month: '$_id.month',
            day: '$_id.day',
            dayOfWeek: {
              $cond: [
                { $eq: ['$_id.dayOfWeek', 7] },
                6,
                { $subtract: ['$_id.dayOfWeek', 1] },
              ],
            },
            hours: { $min: [{ $multiply: ['$loginCount', 2] }, 24] }, // Each login counts as 2 hours, max 24
          },
        },
        {
          $sort: {
            month: 1,
            day: 1,
            dayOfWeek: 1,
          },
        },
      ]);

      return {
        testsTaken,
        totalScore,
        acquiredScore,
        percentage: Math.round(percentage),
        percentile,
        rank,
        totalStudents,
        avgTimePerQuestion,
        correctAnswers,
        incorrectAnswers,
        skippedQuestions,
        totalAnswersInclSkipped,
        totalAnswers,
        successChance,
        studyTimeData,
      };
    } else if (_user.role && _user.role.slug === 'admin') {
      const instituteCount = await this.userModel.countDocuments({
        role: await this.getInstituteRoleId(),
      });
      const studentCount = await this.userModel.countDocuments({
        role: await this.getStudentRoleId(),
      });
      const testCount = await this.resultModel.countDocuments({
        // testType: { $ne: TestType.PRACTICE },
      });
      return { instituteCount, studentCount, testCount };
    }
    return {};
  }

  async getAllInstituteUsersForDropdown(): Promise<User[]> {
    const instituteRoleId = await this.getInstituteRoleId();
    return this.userModel
      .find({ role: instituteRoleId })
      .select('full_name _id packages')
      .populate('packages')
      .exec();
  }

  async getAllStudentUsersForDropdown(instituteId?: string): Promise<any[]> {
    const query: any = { role: await this.getStudentRoleId() };

    // Filter by institute if provided
    if (instituteId) {
      query.institute = instituteId;
    }

    const students = await this.userModel
      .find(query)
      .select('_id full_name email imageUrl regNo')
      .sort({ full_name: 1 })
      .lean()
      .exec();

    return students.map((student) => ({
      _id: student._id,
      full_name: student.full_name,
      email: student.email,
      imageUrl: student.imageUrl,
      regNo: student.regNo || '',
      value: student._id,
      label: student.full_name,
    }));
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel
      .findOne({ phone })
      .populate('role')
      .populate('packages')
      .populate('institute')
      .exec();
  }

  async findByEmailOrRegNo(loginData: string): Promise<User | null> {
    return this.userModel
      .findOne({
        $or: [{ email: loginData }, { regNo: loginData }],
      })
      .exec();
  }

  async findByRegNo(regNo: string): Promise<User | null> {
    return this.userModel
      .findOne({ regNo })
      .populate('role')
      .populate('packages')
      .populate('institute')
      .exec();
  }

  async bulkCreateStudents(students: any[]): Promise<any[]> {
    const createdStudents: any[] = [];

    for (const student of students) {
      const institute = await this.userModel.findOne({
        regNo: student.regNo,
      });
      if (!institute) {
        throw new Error(`Institute with regNo ${student.regNo} not found`);
      }

      const packageIds: any[] = [];
      for (const code of student.packages) {
        const _package = await this.packageModel.findOne({ code });
        if (!_package) {
          throw new Error(`Package with code ${code} not found`);
        }
        packageIds.push(_package._id);
      }

      const newStudent = new this.userModel({
        ...student,
        institute: institute._id,
        packages: packageIds,
      });

      createdStudents.push(await newStudent.save());
    }

    return createdStudents;
  }

  async bulkCreateInstituteUsers(institutes: any[]): Promise<any[]> {
    const createdInstitutes: any[] = [];

    for (const institute of institutes) {
      const packageIds: any[] = [];
      for (const code of institute.packages) {
        const _package = await this.packageModel.findOne({ code });
        if (!_package) {
          throw new Error(`Package with code ${code} not found`);
        }
        packageIds.push(_package._id);
      }

      const newInstitute = new this.userModel({
        ...institute,
        role: await this.getInstituteRoleId(),
        packages: packageIds,
      });

      createdInstitutes.push(await newInstitute.save());
    }

    return createdInstitutes;
  }

  // Analytics methods for dashboard

  async countAllUsers(): Promise<number> {
    return await this.userModel.countDocuments({ status: 'active' });
  }

  async countActiveUsers(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return await this.userModel.countDocuments({
      status: 'active',
      lastLogin: { $gte: date },
    });
  }

  async countInstitutes(): Promise<number> {
    // Find the institute role first
    const instituteRole = await this.roleModel.findOne({ slug: 'institute' });
    if (!instituteRole) return 0;

    // Then query users with that role id
    return this.userModel.countDocuments({
      role: instituteRole._id,
      status: 'active',
    });
  }

  async getNewUsersByMonth(
    months: number,
  ): Promise<Array<{ month: string; count: number }>> {
    const results: any[] = [];
    const date = new Date();

    // Go back 'months' number of months and get counts for each month
    for (let i = 0; i < months; i++) {
      const currentMonth = date.getMonth() - i;
      const year = date.getFullYear() - Math.floor(Math.abs(currentMonth) / 12);
      const month = (currentMonth + 12) % 12;

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const count = await this.userModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'active',
      });

      results.unshift({
        month:
          startDate.toLocaleString('default', { month: 'short' }) + ' ' + year,
        count,
      });
    }

    return results;
  }

  async getUserEngagementByDay(
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const results: any[] = [];
    const date = new Date();

    // Get login activity for each day
    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(date.getDate() - i);

      // Start and end of the day
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      const count = await this.loginHistoryModel.countDocuments({
        loginTime: { $gte: startOfDay, $lte: endOfDay },
      });

      results.unshift({
        date: startOfDay.toISOString().split('T')[0],
        count,
      });
    }

    return results;
  }

  async getInstituteDistribution(): Promise<any[]> {
    // Find the institute role first
    const instituteRole = await this.roleModel.findOne({ slug: 'institute' });
    if (!instituteRole) return [];

    // Get all active institutes
    const institutes = await this.userModel.find({
      role: instituteRole._id,
      status: 'active',
    });

    // For each institute, count their students
    const result: any[] = [];
    for (const institute of institutes) {
      const studentCount = await this.countInstituteUsers(
        institute._id as string,
      );
      result.push({
        institute: institute.full_name,
        studentCount,
      });
    }

    return result;
  }

  // Institute-specific analytics methods

  async countInstituteUsers(instituteId: string): Promise<number> {
    return await this.userModel.countDocuments({
      institute: instituteId,
      status: 'active',
    });
  }

  async countActiveInstituteUsers(
    instituteId: string,
    days: number,
  ): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return await this.userModel.countDocuments({
      institute: instituteId,
      status: 'active',
      lastLogin: { $gte: date },
    });
  }

  async getNewInstituteUsersByMonth(
    instituteId: string,
    months: number,
  ): Promise<Array<{ month: string; count: number }>> {
    const results: any[] = [];
    const date = new Date();

    // Go back 'months' number of months and get counts for each month
    for (let i = 0; i < months; i++) {
      const currentMonth = date.getMonth() - i;
      const year = date.getFullYear() - Math.floor(Math.abs(currentMonth) / 12);
      const month = (currentMonth + 12) % 12;

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const count = await this.userModel.countDocuments({
        institute: instituteId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'active',
      });

      results.unshift({
        month:
          startDate.toLocaleString('default', { month: 'short' }) + ' ' + year,
        count,
      });
    }

    return results;
  }

  async getInstituteUserEngagementByDay(
    instituteId: string,
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const results: any[] = [];
    const date = new Date();

    // First get all users in this institute
    const instituteUsers = await this.userModel
      .find({
        institute: instituteId,
        status: 'active',
      })
      .select('_id');

    const userIds = instituteUsers.map((user) => user._id);

    // Get login activity for each day
    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(date.getDate() - i);

      // Start and end of the day
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      const count = await this.loginHistoryModel.countDocuments({
        userId: { $in: userIds },
        loginTime: { $gte: startOfDay, $lte: endOfDay },
      });

      results.unshift({
        date: startOfDay.toISOString().split('T')[0],
        count,
      });
    }

    return results;
  }

  async getTopPerformingInstituteStudents(
    instituteId: string,
    limit: number,
  ): Promise<Array<any>> {
    // Get all students in this institute
    const students = await this.userModel
      .find({
        institute: instituteId,
        role: { $ne: 'admin' }, // Exclude admins
        status: 'active',
      })
      .select('_id name email')
      .lean();

    const result: any[] = [];

    // For each student, get their test performance
    for (const student of students) {
      const testScores = await this.resultModel.find({
        student: student._id,
      });

      if (testScores.length > 0) {
        // Calculate average score
        const totalScore = testScores.reduce(
          (acc, curr) => acc + curr.marksSummary.totalMarks,
          0,
        );
        const averageScore = totalScore / testScores.length;

        result.push({
          student: {
            id: student._id,
            name: student.full_name,
            email: student.email,
          },
          averageScore,
          testsAttempted: testScores.length,
        });
      }
    }

    // Sort by average score in descending order and return top performers
    return result
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit);
  }

  async getUserGrowthTrend(months: number): Promise<any[]> {
    const result = await this.userModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return result.map((item) => ({
      month: `${item._id.year}-${item._id.month}`,
      count: item.count,
    }));
  }

  async getInstituteGrowthTrend(months: number): Promise<any[]> {
    const role = await this.roleModel.findOne({ slug: 'institute' });
    const result = await this.userModel.aggregate([
      {
        $match: {
          role: role?._id,
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return result.map((item) => ({
      month: `${item._id.year}-${item._id.month}`,
      count: item.count,
    }));
  }

  async getTopPerformingInstitutes(limit: number): Promise<any[]> {
    const role = await this.roleModel.findOne({ slug: 'institute' });
    return this.userModel.aggregate([
      {
        $match: {
          role: role?._id,
        },
      },
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'institute',
          as: 'results',
        },
      },
      {
        $project: {
          name: '$name',
          performance: {
            $avg: '$results.marksSummary.averageMarks',
          },
        },
      },
      { $sort: { performance: -1 } },
      { $limit: limit },
    ]);
  }

  async getHourlyEngagement(): Promise<any[]> {
    const result = await this.userModel.aggregate([
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'student',
          as: 'results',
        },
      },
      {
        $unwind: '$results',
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$results.startedAt' },
            day: { $dayOfWeek: '$results.startedAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    return result.map((item) => ({
      hour: item._id.hour,
      day: item._id.day - 1, // Convert to 0-based day index
      count: item.count,
    }));
  }

  async getInstituteActivityTimes(instituteId: string): Promise<any[]> {
    return this.userModel.aggregate([
      {
        $match: { institute: new Types.ObjectId(instituteId) },
      },
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'student',
          as: 'results',
        },
      },
      {
        $unwind: '$results',
      },
      {
        $group: {
          _id: { $hour: '$results.startedAt' },
          activityLevel: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          hour: '$_id',
          activityLevel: {
            $multiply: [
              { $divide: ['$activityLevel', { $max: '$activityLevel' }] },
              100,
            ],
          },
        },
      },
      { $sort: { hour: 1 } },
    ]);
  }
}
