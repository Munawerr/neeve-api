import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  Notification,
  NotificationType,
  RecipientType,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  async createDiscussionAddedNotifications(
    threadId: string,
    threadCreatorId: string,
    instituteId: string,
    discussionId: string,
    message: string,
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    // Create notification for thread creator
    if (threadCreatorId) {
      const userNotification = await this.create({
        type: NotificationType.DISCUSSION_ADDED,
        recipientType: RecipientType.USER,
        recipient: threadCreatorId,
        thread: threadId,
        discussion: discussionId,
        message,
      });
      notifications.push(userNotification);
    }

    // Create notification for institute if available
    if (instituteId) {
      const instituteNotification = await this.create({
        type: NotificationType.DISCUSSION_ADDED,
        recipientType: RecipientType.INSTITUTE,
        recipient: instituteId,
        thread: threadId,
        discussion: discussionId,
        message,
      });
      notifications.push(instituteNotification);
    }

    return notifications;
  }

  async findAll(
    userId?: string,
    instituteId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const query: any = {};

    // Filter by recipient (user or institute)
    if (userId) {
      query.recipientType = RecipientType.USER;
      query.recipient = userId;
    } else if (instituteId) {
      query.recipientType = RecipientType.INSTITUTE;
      query.recipient = instituteId;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('thread')
        .populate('discussion')
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return { notifications, total };
  }

  async findOne(id: string): Promise<Notification | null> {
    return this.notificationModel
      .findById(id)
      .populate('thread')
      .populate('discussion')
      .exec();
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification | null> {
    return this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec();
  }

  async markAsRead(id: string): Promise<Notification | null> {
    return this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId?: string, instituteId?: string): Promise<void> {
    const query: any = {};

    if (userId) {
      query.recipientType = RecipientType.USER;
      query.recipient = userId;
    } else if (instituteId) {
      query.recipientType = RecipientType.INSTITUTE;
      query.recipient = instituteId;
    }

    await this.notificationModel.updateMany(query, { isRead: true }).exec();
  }

  async remove(id: string): Promise<Notification | null> {
    return this.notificationModel.findByIdAndDelete(id).exec();
  }
}
