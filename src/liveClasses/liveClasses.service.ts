import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LiveClass } from './schemas/liveClass.schema';
import { CreateLiveClassDto } from './dto/create-liveClass.dto';
import { UpdateLiveClassDto } from './dto/update-liveClass.dto';

@Injectable()
export class LiveClassesService {
  constructor(
    @InjectModel(LiveClass.name) private liveClassModel: Model<LiveClass>,
  ) {}

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
  ) {
    const query = search
      ? {
          institute,
          title: { $regex: search, $options: 'i' },
          isDeleted: { $ne: true },
        }
      : { institute, isDeleted: { $ne: true } };
    const liveClasses = await this.liveClassModel
      .find(query)
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
      .exec();
    const total = await this.liveClassModel.countDocuments(query).exec();
    return { liveClasses, total };
  }

  findOne(id: string): Promise<LiveClass | null> {
    return this.liveClassModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('package')
      .populate('subject')
      .exec();
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

  async countUpcomingLiveClasses(institute: string): Promise<number> {
    const today = new Date();
    const count = await this.liveClassModel
      .countDocuments({
        institute,
        isDeleted: { $ne: true },
        date: { $gte: today },
      })
      .exec();
    return count;
  }
}
