import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose'; // Import Mongoose Schema
import { Role } from './../roles/schemas/role.schema';
import { Result } from './../results/schemas/result.schema'; // Import Result schema

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
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }),
    };
    const users = await this.userModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments(filter);
    return { users, total };
  }

  async deleteInstituteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  private async getInstituteRoleId(): Promise<
    MongooseSchema.Types.ObjectId | unknown
  > {
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
    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      role: await this.getStudentRoleId(), // Get student role ID
      institute: userData.institute, // Reference to institute user
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
    return this.userModel.findById(id).exec();
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
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }),
      ...(institute && { institute }),
    };
    const users = await this.userModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments(filter);
    return { users, total };
  }

  async deleteStudentUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  private async getStudentRoleId(): Promise<
    MongooseSchema.Types.ObjectId | unknown
  > {
    const studentRole = await this.roleModel.findOne({ slug: 'student' });
    if (!studentRole) {
      throw new Error('Student role not found');
    }
    return studentRole._id;
  }

  async getUserAnalytics(user: User): Promise<any> {
    const _user = user.toObject();
    if (_user.role.slug === 'institute') {
      const studentCount = await this.userModel.countDocuments({
        institute: user._id,
        role: await this.getStudentRoleId(),
      });
      const testResultsCount = await this.resultModel.countDocuments({
        institute: user._id,
      });
      return { studentCount, testResultsCount };
    } else if (_user.role.slug === 'student') {
      const testResults = await this.resultModel
        .find({ student: user._id })
        .exec();
      const testsTaken = testResults.length;
      const totalScore = testResults.reduce(
        (sum, result) => sum + result.marksPerQuestion * result.numOfQuestions,
        0,
      );
      const acquiredScore = testResults.reduce(
        (sum, result) =>
          sum +
          result
            .toObject()
            .questionResults.reduce(
              (qSum, qResult: any) => qSum + qResult.score,
              0,
            ),
        0,
      );
      const percentage = (acquiredScore / totalScore) * 100;
      const avgTimePerQuestion =
        testResults.reduce(
          (sum, result) =>
            sum +
            (result.finishedAt.getTime() - result.startedAt.getTime()) /
              result.numOfQuestions,
          0,
        ) /
        testsTaken /
        60000;
      return {
        testsTaken,
        acquiredScore,
        totalScore,
        percentage,
        avgTimePerQuestion,
      };
    } else if (_user.role.slug === 'admin') {
      const instituteCount = await this.userModel.countDocuments({
        role: await this.getInstituteRoleId(),
      });
      const studentCount = await this.userModel.countDocuments({
        role: await this.getStudentRoleId(),
      });
      const testCount = await this.resultModel.countDocuments();
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
}
