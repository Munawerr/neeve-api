import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Class } from './schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Package } from 'src/packages/schemas/package.schema';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private readonly classModel: Model<Class>,
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
  ) {}

  create(createClassDto: CreateClassDto): Promise<Class> {
    const createdClass = new this.classModel(createClassDto);
    return createdClass.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ classes: Class[]; total: number }> {
    const filter = search
      ? {
          isDeleted: { $ne: true },
          $or: [{ title: { $regex: search, $options: 'i' } }],
        }
      : { isDeleted: { $ne: true } };

    const classes = await this.classModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.classModel.countDocuments(filter);
    return { classes, total };
  }

  async findAllForDropdown(): Promise<Class[]> {
    return this.classModel.find({ isDeleted: { $ne: true } }, 'title').exec();
  }

  async getAllClassesForDropdown(
    courseId?: string,
    instituteId?: string,
  ): Promise<any[]> {
    const query: any = {};

    // Filter by course if provided
    if (courseId) {
      query.course = courseId;
    }

    // Filter by institute if provided
    if (instituteId) {
      query.institute = instituteId;
    }

    const classes = await this.classModel
      .find({ ...query, isDeleted: { $ne: true } })
      .select('_id title')
      .sort({ title: 1 })
      .lean()
      .exec();

    return classes.map((classItem) => ({
      _id: classItem._id,
      title: classItem.title,
      value: classItem._id,
      label: classItem.title,
    }));
  }

  findOne(id: string): Promise<Class | null> {
    return this.classModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  update(id: string, updateClassDto: UpdateClassDto): Promise<Class | null> {
    return this.classModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        updateClassDto,
        { new: true },
      )
      .exec();
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const existingClass = await this.classModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    const referencingPackages = await this.packageModel
      .find({ class: id, isDeleted: { $ne: true } })
      .select('_id code description')
      .lean();

    if (referencingPackages.length > 0) {
      throw new ConflictException({
        message:
          'This class is linked to active package records. Remove those links before deleting the class.',
        blockedBy: referencingPackages.map((pkg) => ({
          type: 'Package',
          id: String(pkg._id),
          name: pkg.description || pkg.code,
          actionHint: 'Edit the package and change its class first.',
        })),
      });
    }

    await this.classModel
      .updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() })
      .exec();

    return { deleted: true };
  }

  async findDeleted(): Promise<Class[]> {
    return this.classModel.find({ isDeleted: true }).sort({ deletedAt: -1 }).exec();
  }

  async restore(id: string): Promise<Class | null> {
    return this.classModel
      .findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true },
      )
      .exec();
  }
}
