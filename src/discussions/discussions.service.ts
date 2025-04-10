import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { Discussion } from './schemas/discussion.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectModel(Discussion.name) private discussionModel: Model<Discussion>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDiscussionDto: CreateDiscussionDto): Promise<Discussion> {
    const newDiscussion = new this.discussionModel(createDiscussionDto);
    const savedDiscussion = await newDiscussion.save();

    // Populate the thread to get thread creator and institute information
    const populatedDiscussion = await this.discussionModel
      .findById(savedDiscussion._id)
      .populate({
        path: 'thread',
        select: 'user institute title',
      })
      .exec();

    if (populatedDiscussion?.thread) {
      const thread: any = populatedDiscussion.thread;
      const threadCreatorId = thread.user?.toString();
      const instituteId = thread.institute?.toString();

      if (threadCreatorId || instituteId) {
        // Create notifications for thread creator and institute
        await this.notificationsService.createDiscussionAddedNotifications(
          thread._id.toString(),
          threadCreatorId,
          instituteId,
          savedDiscussion._id as string,
          `New comment added to thread: ${thread.title}`,
        );
      }
    }

    return savedDiscussion;
  }

  async findAll(
    threadId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ discussions: Discussion[]; total: number }> {
    const query: any = { thread: threadId };

    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [discussions, total] = await Promise.all([
      this.discussionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email profilePicture')
        .exec(),
      this.discussionModel.countDocuments(query).exec(),
    ]);

    return { discussions, total };
  }

  async findOne(id: string): Promise<Discussion | null> {
    return this.discussionModel
      .findById(id)
      .populate('user', 'name email profilePicture')
      .exec();
  }

  async update(
    id: string,
    updateDiscussionDto: UpdateDiscussionDto,
  ): Promise<Discussion | null> {
    return this.discussionModel
      .findByIdAndUpdate(id, updateDiscussionDto, { new: true })
      .exec();
  }

  async markAsDeleted(id: string): Promise<Discussion | null> {
    return this.discussionModel
      .findByIdAndUpdate(
        id,
        { content: '[This comment has been deleted]' },
        { new: true },
      )
      .exec();
  }
}
