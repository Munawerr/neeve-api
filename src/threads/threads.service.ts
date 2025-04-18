import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async create(createThreadDto: CreateThreadDto): Promise<Thread> {
    // Validate if the user is an admin when creating a global thread
    if (createThreadDto.isGlobal) {
      const user = await this.usersService.findOne(createThreadDto.user);
      if (!user || !(await this.isUserAdmin(user._id as string))) {
        throw new ForbiddenException('Only admins can create global threads');
      }
    }

    // Validate institute-only threads
    if (createThreadDto.isInstituteOnly) {
      const user = await this.usersService.findOne(createThreadDto.user);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Check if user is from the institute or is an admin
      const isAdmin = await this.isUserAdmin(user._id as string);
      const isFromInstitute =
        user.institute &&
        user.institute.toString() === createThreadDto.institute;

      if (!isAdmin && !isFromInstitute) {
        throw new ForbiddenException(
          'Only users from this institute can create institute-only threads',
        );
      }
    }

    const createdThread = new this.threadModel(createThreadDto);
    return createdThread.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    userId?: string,
    isGlobal?: boolean,
    isInstituteOnly?: boolean,
    institute?: string,
  ): Promise<{ threads: Thread[]; total: number }> {
    const skip = (page - 1) * limit;

    // Base query filter
    const filter: any = search
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    if (userId) {
      const user = await this.usersService.findOne(userId);

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isAdmin = await this.isUserAdmin(userId);

      if (!isAdmin) {
        if (user.institute) {
          filter.$or = [
            { isGlobal: true },
            { institute: user.institute, isInstituteOnly: true },
            { isGlobal: { $ne: true }, isInstituteOnly: { $ne: true } },
          ];
        } else {
          filter.$or = [
            { isGlobal: true },
            { isGlobal: { $ne: true }, isInstituteOnly: { $ne: true } },
          ];
        }
      }
    }

    // Add search functionality if search parameter is provided
    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by global status if specified
    if (isGlobal === true) {
      filter.isGlobal = true;
    }

    // Filter by institute-only status if specified
    if (isInstituteOnly === true) {
      filter.isInstituteOnly = true;

      // If institute is specified, filter by that institute
      if (institute) {
        filter.institute = new Types.ObjectId(institute);
      }
    }

    const threads = await this.threadModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'full_name email profile_picture')
      .populate('topic', 'title code')
      .populate('institute', 'name logo')
      .exec();
    const total = await this.threadModel.countDocuments(filter).exec();
    return { threads, total };
  }

  async findAllByTopicId(
    topicId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    userId?: string,
  ): Promise<{ threads: Thread[]; total: number }> {
    const skip = (page - 1) * limit;

    // Base query for topic-specific threads
    const filter: any = {
      topic: new Types.ObjectId(topicId),
      ...(search && { title: { $regex: search, $options: 'i' } }),
    };

    if (userId) {
      const user = await this.usersService.findOne(userId);

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isAdmin = await this.isUserAdmin(userId);

      if (!isAdmin) {
        if (user.institute) {
          filter.$or = [
            { isGlobal: true },
            { institute: user.institute, isInstituteOnly: true },
            { isGlobal: { $ne: true }, isInstituteOnly: { $ne: true } },
          ];
        } else {
          filter.$or = [
            { isGlobal: true },
            { isGlobal: { $ne: true }, isInstituteOnly: { $ne: true } },
          ];
        }
      }
    }

    const threads = await this.threadModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'full_name email profile_picture')
      .populate('topic', 'title code')
      .populate('institute', 'name logo')
      .exec();
    const total = await this.threadModel.countDocuments(filter).exec();
    return { threads, total };
  }

  async findOne(id: string, userId?: string): Promise<Thread> {
    const thread = await this.threadModel
      .findById(id)
      .populate('user', 'full_name email profile_picture')
      .populate('topic', 'title code')
      .populate('institute', 'name logo')
      .exec();

    if (!thread) {
      throw new NotFoundException(`Thread with ID "${id}" not found`);
    }

    if (userId) {
      const user = await this.usersService.findOne(userId);

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isAdmin = await this.isUserAdmin(userId);

      if (!isAdmin) {
        if (
          thread.isInstituteOnly &&
          (!user.institute ||
            user.institute.toString() !== thread.institute?.toString())
        ) {
          throw new ForbiddenException(
            'You do not have permission to view this thread',
          );
        }
      }
    }

    return thread;
  }

  async update(
    id: string,
    updateThreadDto: UpdateThreadDto,
    userId?: string,
  ): Promise<Thread | null> {
    const thread = await this.threadModel.findById(id).exec();

    if (!thread) {
      throw new NotFoundException(`Thread with ID "${id}" not found`);
    }

    if (userId) {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isAdmin = await this.isUserAdmin(userId);
      const isThreadCreator = thread.user.toString() === userId;

      if (!isAdmin && !isThreadCreator) {
        throw new ForbiddenException(
          'You do not have permission to update this thread',
        );
      }

      if (updateThreadDto.isGlobal && !isAdmin) {
        throw new ForbiddenException('Only admins can create global threads');
      }
    }

    return this.threadModel
      .findByIdAndUpdate(id, updateThreadDto, { new: true })
      .exec();
  }

  async remove(id: string, userId?: string): Promise<void> {
    const thread = await this.threadModel.findById(id).exec();

    if (!thread) {
      throw new NotFoundException(`Thread with ID "${id}" not found`);
    }

    if (userId) {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isAdmin = await this.isUserAdmin(userId);
      const isThreadCreator = thread.user.toString() === userId;

      if (!isAdmin && !isThreadCreator) {
        throw new ForbiddenException(
          'You do not have permission to delete this thread',
        );
      }
    }

    await this.threadModel.findByIdAndDelete(id);
  }

  async findOrCreateGlobalThread(
    instituteId: string,
    classId: string,
  ): Promise<Thread> {
    let thread = await this.threadModel
      .findOne({
        institute: instituteId,
        class: classId,
        isInstituteOnly: true,
      })
      .populate('user', 'full_name email profile_picture')
      .populate('institute', 'name logo')
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
        isGlobal: false,
      };

      thread = new this.threadModel({
        ...instituteThreadData,
        isInstituteOnly: true,
      });
      await thread.save();
    }
    return thread;
  }

  private async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.role) {
      return false;
    }

    return user.role['slug'] === 'admin';
  }
}
