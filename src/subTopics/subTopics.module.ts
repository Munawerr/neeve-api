import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubTopicsController } from './subTopics.controller';
import { SubTopicsService } from './subTopics.service';
import { SubTopic, SubTopicSchema } from './schemas/subTopic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SubTopic.name, schema: SubTopicSchema }]),
  ],
  controllers: [SubTopicsController],
  providers: [SubTopicsService],
})
export class SubTopicsModule {}
