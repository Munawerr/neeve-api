import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Analytics, ActivityType } from './schemas/analytics.schema';
import { Discussion } from 'src/discussions/schemas/discussion.schema';
import { LiveClass } from 'src/liveClasses/schemas/liveClass.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Analytics.name) private analyticsModel: Model<Analytics>,
    @InjectModel(Discussion.name) private discussionModel: Model<Discussion>,
    @InjectModel(LiveClass.name) private liveClassModel: Model<LiveClass>,
  ) {}

  async trackActivity(
    userId: string,
    instituteId: string,
    topicId: string,
    activityType: ActivityType,
    resourceId: string,
    resourceName: string,
  ) {
    const analytics = new this.analyticsModel({
      userId,
      instituteId,
      topicId,
      activityType,
      resourceId,
      resourceName,
    });
    return analytics.save();
  }

  async getResourceViewsLast7Days(instituteId: string | null = null) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (instituteId) {
      return this.analyticsModel.countDocuments({
        instituteId,
        activityType: ActivityType.RESOURCE_VIEW,
        timestamp: { $gte: sevenDaysAgo },
      });
    }

    return this.analyticsModel.countDocuments({
      activityType: ActivityType.RESOURCE_VIEW,
      timestamp: { $gte: sevenDaysAgo },
    });
  }

  async getVideoViewsLast7Days(instituteId: string | null = null) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (instituteId) {
      return this.analyticsModel.countDocuments({
        instituteId,
        activityType: ActivityType.VIDEO_WATCH,
        timestamp: { $gte: sevenDaysAgo },
      });
    }

    return this.analyticsModel.countDocuments({
      activityType: ActivityType.VIDEO_WATCH,
      timestamp: { $gte: sevenDaysAgo },
    });
  }

  async getDailyActivityCount(
    days: number = 7,
    instituteId: string | null = null,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    let aggregateMatch = {
      timestamp: { $gte: startDate },
    };

    if (instituteId) {
      aggregateMatch['instituteId'] = instituteId;
    }

    return this.analyticsModel.aggregate([
      {
        $match: aggregateMatch,
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            type: '$activityType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          activities: {
            $push: {
              type: '$_id.type',
              count: '$count',
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  async getOpenDiscussionsCount(institute?: string): Promise<number> {
    const query = institute ? { institute } : {};
    return this.discussionModel.countDocuments(query).exec();
  }

  async getLiveClassesMetrics(
    institute?: string,
  ): Promise<{ upcoming: number; conducted: number }> {
    const today = new Date();
    const query = institute ? { institute } : {};

    const [upcoming, conducted] = await Promise.all([
      this.liveClassModel
        .countDocuments({
          ...query,
          date: { $gte: today },
        })
        .exec(),
      this.liveClassModel
        .countDocuments({
          ...query,
          date: { $lt: today },
        })
        .exec(),
    ]);

    return { upcoming, conducted };
  }
}
