import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Analytics, AnalyticsSchema } from './schemas/analytics.schema';
import { Discussion, DiscussionSchema } from '../discussions/schemas/discussion.schema';
import { LiveClass, LiveClassSchema } from '../liveClasses/schemas/liveClass.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Analytics.name, schema: AnalyticsSchema },
      { name: Discussion.name, schema: DiscussionSchema },
      { name: LiveClass.name, schema: LiveClassSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}