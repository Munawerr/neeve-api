import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { Topic, TopicSchema } from './schemas/topic.schema';
import {
  SubTopic,
  SubTopicSchema,
} from 'src/subTopics/schemas/subTopic.schema';
import { SubTopicsService } from 'src/subTopics/subTopics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: SubTopic.name, schema: SubTopicSchema },
    ]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService, SubTopicsService],
})
export class TopicsModule {}
