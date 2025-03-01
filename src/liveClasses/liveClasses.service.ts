import { Injectable } from '@nestjs/common';
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
    return this.liveClassModel.find().exec();
  }

  async findAllWithPaging(
    institute: string,
    page: number,
    limit: number,
    search: string,
  ) {
    const query = search
      ? { institute, title: { $regex: search, $options: 'i' } }
      : { institute };
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
      .findById(id)
      .populate('package')
      .populate('subject')
      .exec();
  }

  update(
    id: string,
    updateLiveClassDto: UpdateLiveClassDto,
  ): Promise<LiveClass | null> {
    return this.liveClassModel
      .findByIdAndUpdate(id, updateLiveClassDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<LiveClass | null> {
    return this.liveClassModel.findByIdAndDelete(id).exec();
  }
}
