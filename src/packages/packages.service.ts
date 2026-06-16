import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package } from './schemas/package.schema';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { User } from 'src/users/schemas/user.schema';
import { Topic } from 'src/topics/schemas/topic.schema';
import { LiveClass } from 'src/liveClasses/schemas/liveClass.schema';

@Injectable()
export class PackagesService {
  private static readonly CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private static readonly RANDOM_SUFFIX_LENGTH = 8;

  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
    @InjectModel(LiveClass.name)
    private readonly liveClassModel: Model<LiveClass>,
  ) {}

  create(createPackageDto: CreatePackageDto): Promise<Package> {
    const createdPackage = new this.packageModel(createPackageDto);
    return createdPackage.save();
  }

  private buildRandomCode(length: number): string {
    let result = '';
    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(
        Math.random() * PackagesService.CODE_CHARSET.length,
      );
      result += PackagesService.CODE_CHARSET[randomIndex];
    }
    return result;
  }

  async generateUniqueCode(
    courseCode: string,
    classCode: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${isNaN(Number(courseCode)) ? courseCode : 'C' + String(courseCode)}/${isNaN(Number(classCode)) ? classCode : 'C' + String(classCode)}/${year}/${this.buildRandomCode(PackagesService.RANDOM_SUFFIX_LENGTH)}`;
      const exists = await this.packageModel.exists({ code: candidate });
      if (!exists) {
        return candidate;
      }
    }

    throw new Error('Failed to generate unique package code');
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ packages: Package[]; total: number }> {
    const filter = search
      ? {
          isDeleted: { $ne: true },
          $or: [
            { code: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : { isDeleted: { $ne: true } };

    const packages = await this.packageModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subjects')
      .exec();
    const total = await this.packageModel.countDocuments(filter);
    return { packages, total };
  }

  async findAllForDropdown(): Promise<Package[]> {
    return this.packageModel
      .find({ isDeleted: { $ne: true } }, 'code description')
      .populate('subjects')
      .populate('course')
      .exec();
  }

  async getAllPackagesForDropdown(instituteId?: string): Promise<any[]> {
    const query: any = {};

    // Filter by institute if provided
    if (instituteId) {
      query.institute = instituteId;
    }

    const packages = await this.packageModel
      .find({ ...query, isDeleted: { $ne: true } })
      .select('_id code description')
      .sort({ code: 1 })
      .populate('course', 'title')
      .populate('class', 'title')
      .populate('subjects')
      .lean()
      .exec();

    return packages.map((pkg) => ({
      _id: pkg._id,
      name: pkg.description,
      code: pkg.code,
      description: pkg.description,
      course: pkg.course,
      class: pkg.class,
      subjects: pkg.subjects,
      value: pkg._id,
      label: pkg.description,
    }));
  }

  findOne(id: string): Promise<Package | null> {
    return this.packageModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('course')
      .populate('class')
      .populate('subjects')
      .exec();
  }

  findByIds(ids: string[], populateData: boolean = false): Promise<Package[]> {
    if (populateData) {
      return this.packageModel
        .find({ _id: { $in: ids }, isDeleted: { $ne: true } })
        .populate('course')
        .populate('class')
        .populate('subjects')
        .exec();
    }
    return this.packageModel
      .find({ _id: { $in: ids }, isDeleted: { $ne: true } })
      .exec();
  }

  update(
    id: string,
    updatePackageDto: UpdatePackageDto,
  ): Promise<Package | null> {
    return this.packageModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        updatePackageDto,
        { new: true },
      )
      .exec();
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const pkg = await this.packageModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const [assignedUsers, topicRefs, liveClassRefs] = await Promise.all([
      this.userModel
        .find({ packages: id, isDeleted: { $ne: true } })
        .select('_id full_name email regNo')
        .lean(),
      this.topicModel
        .find({ package: id, isDeleted: { $ne: true } })
        .select('_id title code')
        .lean(),
      this.liveClassModel
        .find({ package: id, isDeleted: { $ne: true } })
        .select('_id title')
        .lean(),
    ]);

    const blockedBy = [
      ...assignedUsers.map((user) => ({
        type: 'User',
        id: String(user._id),
        name: user.full_name || user.email || user.regNo || String(user._id),
        actionHint:
          'Unassign this package from institute/student records before deleting.',
      })),
      ...topicRefs.map((topic) => ({
        type: 'Topic',
        id: String(topic._id),
        name: topic.title || topic.code,
        actionHint: 'Delete or reassign dependent topics first.',
      })),
      ...liveClassRefs.map((liveClass) => ({
        type: 'LiveClass',
        id: String(liveClass._id),
        name: liveClass.title,
        actionHint: 'Delete or reassign live classes first.',
      })),
    ];

    if (blockedBy.length > 0) {
      throw new ConflictException({
        message:
          'This package is still referenced by active users or learning resources.',
        blockedBy,
      });
    }

    await this.packageModel
      .updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() })
      .exec();
    return { deleted: true };
  }

  async findDeleted(): Promise<Package[]> {
    return this.packageModel
      .find({ isDeleted: true })
      .populate('course')
      .populate('class')
      .populate('subjects')
      .sort({ deletedAt: -1 })
      .exec();
  }

  async restore(id: string): Promise<Package | null> {
    return this.packageModel
      .findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true },
      )
      .exec();
  }
}
