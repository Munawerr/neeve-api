import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Thread } from './schemas/thread.schema';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';

@Injectable()
export class ThreadsService {
  constructor(@InjectModel(Thread.name) private threadModel: Model<Thread>) {}

  create(createThreadDto: CreateThreadDto): Promise<Thread> {
    const createdThread = new this.threadModel(createThreadDto);
    return createdThread.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ threads: Thread[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = search ? { title: { $regex: search, $options: 'i' } } : {};
    const threads = await this.threadModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user')
      .exec();
    const total = await this.threadModel.countDocuments(query).exec();
    return { threads, total };
  }

  async findAllByTopicId(
    topicId: string,
    page: number,
    limit: number,
    search: string,
  ): Promise<{ threads: Thread[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = {
      topic: topicId,
      ...(search && { title: { $regex: search, $options: 'i' } }),
    };
    const threads = await this.threadModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user')
      .exec();
    const total = await this.threadModel.countDocuments(query).exec();
    return { threads, total };
  }

  findOne(id: string): Promise<Thread | null> {
    return this.threadModel
      .findById(id)
      .populate('user')
      .populate('topic')
      .exec();
  }

  update(id: string, updateThreadDto: UpdateThreadDto): Promise<Thread | null> {
    return this.threadModel
      .findByIdAndUpdate(id, updateThreadDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Thread | null> {
    return this.threadModel.findByIdAndDelete(id).exec();
  }
}
