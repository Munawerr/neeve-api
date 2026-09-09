import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LiveClass } from './schemas/liveClass.schema';
import { LiveClassAttendance } from './schemas/liveClassAttendance.schema';
import { CreateLiveClassDto } from './dto/create-liveClass.dto';
import { UpdateLiveClassDto } from './dto/update-liveClass.dto';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class LiveClassesService {
  constructor(
    @InjectModel(LiveClass.name) private liveClassModel: Model<LiveClass>,
    @InjectModel(LiveClassAttendance.name)
    private liveClassAttendanceModel: Model<LiveClassAttendance>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  private async buildAudienceQuery(
    institute: string,
    role?: string,
    userId?: string,
  ): Promise<Record<string, any>> {
    const query: Record<string, any> = {
      institute,
      isDeleted: { $ne: true },
    };

    if (role === 'student' && userId) {
      const student = await this.userModel
        .findById(userId)
        .select('packages')
        .lean();

      const packageIds = Array.isArray(student?.packages)
        ? student.packages.map((pkg: any) => pkg.toString())
        : [];

      if (packageIds.length === 0) {
        query.package = { $in: [] };
      } else {
        query.package = { $in: packageIds };
      }
    }

    return query;
  }

  create(createLiveClassDto: CreateLiveClassDto): Promise<LiveClass> {
    const createdLiveClass = new this.liveClassModel(createLiveClassDto);
    return createdLiveClass.save();
  }

  findAll(): Promise<LiveClass[]> {
    return this.liveClassModel.find({ isDeleted: { $ne: true } }).exec();
  }

  async findAllWithPaging(
    institute: string,
    page: number,
    limit: number,
    search: string,
    role?: string,
    userId?: string,
  ) {
    const baseQuery = await this.buildAudienceQuery(institute, role, userId);
    const query = search
      ? {
          ...baseQuery,
          title: { $regex: search, $options: 'i' },
        }
      : baseQuery;
    const liveClasses = await this.liveClassModel
      .find(query)
      .sort({ date: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'package',
        model: 'Package',
        populate: [
          { path: 'course', model: 'Course' },
          { path: 'class', model: 'Class' },
        ],
      })
      .populate('subject')
      .lean()
      .exec();
    const total = await this.liveClassModel.countDocuments(query).exec();
    return {
      liveClasses: this.stripLinksForStudents(liveClasses, role),
      total,
    };
  }

  async findOne(
    id: string,
    role?: string,
  ): Promise<LiveClass | null> {
    const liveClass = await this.liveClassModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('package')
      .populate('subject')
      .lean()
      .exec();
    if (!liveClass) return null;
    return this.stripLinksForStudents(
      liveClass,
      role,
    ) as unknown as LiveClass;
  }

  update(
    id: string,
    updateLiveClassDto: UpdateLiveClassDto,
  ): Promise<LiveClass | null> {
    return this.liveClassModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        updateLiveClassDto,
        { new: true },
      )
      .exec();
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const existing = await this.liveClassModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();

    if (!existing) {
      throw new NotFoundException('Live class not found');
    }

    await this.liveClassModel
      .updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() })
      .exec();
    return { deleted: true };
  }

  async findDeleted(): Promise<LiveClass[]> {
    return this.liveClassModel
      .find({ isDeleted: true })
      .populate('package')
      .populate('subject')
      .sort({ deletedAt: -1 })
      .exec();
  }

  async restore(id: string): Promise<LiveClass | null> {
    return this.liveClassModel
      .findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true },
      )
      .exec();
  }

  async countUpcomingLiveClasses(
    institute: string,
    role?: string,
    userId?: string,
  ): Promise<number> {
    const today = new Date();
    const baseQuery = await this.buildAudienceQuery(institute, role, userId);
    const count = await this.liveClassModel
      .countDocuments({
        ...baseQuery,
        date: { $gte: today },
      })
      .exec();
    return count;
  }

  // Students must never receive the live session link from listing/detail
  // responses. The link is only returned after a successful join verification.
  private stripLinksForStudents<T>(data: T, role?: string): T {
    if (role === 'student') {
      if (Array.isArray(data)) {
        return (data as any[]).map((item) =>
          this.stripLink(item),
        ) as unknown as T;
      }
      if (data && typeof data === 'object') {
        return this.stripLink(data) as T;
      }
    }
    return data;
  }

  private stripLink(item: any): any {
    if (!item) return item;
    const { liveSessionUrl, ...rest } = item;
    return rest;
  }

  // Combines the class date with a "HH:mm" time string into a Date.
  private combineDateAndTime(dateValue: Date, timeString: string): Date {
    const date = new Date(dateValue);
    const [hours, minutes] = timeString.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  private async resolveJoinContext(userId: string, liveClass: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const liveClassInstitute = liveClass.institute?.toString();
    const userInstitute = user.institute?.toString();

    const belongsToInstitute =
      userInstitute === liveClassInstitute ||
      userId === liveClassInstitute;

    if (!belongsToInstitute) {
      throw new ForbiddenException(
        'You are not enrolled in this institute to join this live class',
      );
    }

    return {
      user,
      instituteId: liveClassInstitute,
    };
  }

  async joinLiveClass(
    liveClassId: string,
    userId: string,
  ): Promise<{ liveSessionUrl: string; attendance: LiveClassAttendance }> {
    const liveClass = await this.liveClassModel
      .findOne({ _id: liveClassId, isDeleted: { $ne: true } })
      .exec();
    if (!liveClass) {
      throw new NotFoundException('Live class not found');
    }

    if (!liveClass.liveSessionUrl) {
      throw new BadRequestException('Live session link has not been configured');
    }

    const { user, instituteId } = await this.resolveJoinContext(userId, liveClass);

    // Join window: from 5 minutes before start until the end of the class.
    const now = new Date();
    const startDateTime = this.combineDateAndTime(
      liveClass.date,
      liveClass.startTime,
    );
    const endDateTime = this.combineDateAndTime(liveClass.date, liveClass.endTime);
    const joinOpenAt = new Date(startDateTime.getTime() - 5 * 60 * 1000);

    if (now < joinOpenAt) {
      throw new ForbiddenException(
        'The live class is not open yet. It will open 5 minutes before the scheduled start time.',
      );
    }

    if (now > endDateTime) {
      throw new ForbiddenException('This live class has ended.');
    }

    // Upsert a single attendance record per student per live class.
    const studentName =
      user.full_name ||
      (user as any).name ||
      user.email ||
      'Unknown Student';
    const attendance = await this.liveClassAttendanceModel
      .findOneAndUpdate(
        { liveClass: liveClassId, student: userId },
        {
          $set: {
            lastJoinedAt: now,
          },
          $setOnInsert: {
            liveClass: liveClassId,
            student: userId,
            institute: instituteId,
            studentName,
            studentPhone: user.phone || '',
            studentRegNo: user.regNo || '',
            studentEmail: user.email || '',
            joinedAt: now,
          },
          $inc: { joinCount: 1 },
        },
        { new: true, upsert: true },
      )
      .exec();

    return { liveSessionUrl: liveClass.liveSessionUrl, attendance };
  }

  async getAttendance(
    liveClassId: string,
    page: number,
    limit: number,
  ): Promise<{ attendees: LiveClassAttendance[]; total: number }> {
    const liveClass = await this.liveClassModel
      .findOne({ _id: liveClassId, isDeleted: { $ne: true } })
      .lean();
    if (!liveClass) {
      throw new NotFoundException('Live class not found');
    }

    const query = { liveClass: liveClassId };
    const [attendees, total] = await Promise.all([
      this.liveClassAttendanceModel
        .find(query)
        .sort({ joinedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.liveClassAttendanceModel.countDocuments(query).exec(),
    ]);

    return { attendees, total };
  }

  async hasAttendanceAccess(
    userId: string,
    liveClassId: string,
  ): Promise<boolean> {
    const liveClass = await this.liveClassModel
      .findOne({ _id: liveClassId, isDeleted: { $ne: true } })
      .lean();
    if (!liveClass) {
      throw new NotFoundException('Live class not found');
    }
    const user = await this.userModel
      .findById(userId)
      .populate('role')
      .lean();
    if (!user) return false;

    const roleSlug = (user.role as any)?.slug;
    // Global admins / super admins can always view.
    if (roleSlug === 'super-admin' || roleSlug === 'admin') return true;
    // Institute owners/admins of the owning institute.
    if (roleSlug === 'institute' || roleSlug === 'institute-admin') {
      return (
        user.institute?.toString() === liveClass.institute?.toString() ||
        user._id.toString() === liveClass.institute?.toString()
      );
    }
    return false;
  }
}
