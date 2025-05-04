import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityType } from './schemas/analytics.schema';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(JwtAuthGuard)
  async trackActivity(
    @Body('topicId') topicId: string,
    @Body('activityType') activityType: ActivityType,
    @Body('resourceId') resourceId: string,
    @Body('resourceName') resourceName: string,
    @Body('userId') userId: string,
    @Body('instituteId') instituteId: string,
  ) {
    return this.analyticsService.trackActivity(
      userId,
      instituteId,
      topicId,
      activityType,
      resourceId,
      resourceName,
    );
  }
}
