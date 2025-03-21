import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Thread } from './schemas/thread.schema';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { CreateGlobalThreadDto } from './dto/create-global-thread.dto';
import { UsersService } from '../users/users.service';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class ThreadsService {
  constructor(
    @InjectModel(Thread.name) private threadModel: Model<Thread>,
    private readonly usersService: UsersService,
    private readonly classesService: ClassesService,
  ) {}

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

  async findOrCreateGlobalThread(
    instituteId: string,
    classId: string,
  ): Promise<Thread> {
    let thread = await this.threadModel
      .findOne({ institute: instituteId, class: classId })
      .exec();
    if (!thread) {
      const instituteUser = await this.usersService.findOne(instituteId);
      const classData = await this.classesService.findOne(classId);

      if (!instituteUser || !classData) {
        throw new Error('Institute or Class not found');
      }

      const title = `Discussion Thread for ${instituteUser.full_name} - ${classData.title}`;
      const content = `<p>This is the Discussion thread for the institute <strong>${instituteUser.full_name}</strong> and the class <strong>${classData.title}</strong>.</p>`;

      const instituteThreadData: CreateGlobalThreadDto = {
        user: instituteId,
        institute: instituteId,
        class: classId,
        title,
        content,
      };

      thread = new this.threadModel(instituteThreadData);
      await thread.save();
    }
    return thread;
  }
}
