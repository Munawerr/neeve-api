import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { Test, TestSchema } from './schemas/test.schema';
import { TopicsService } from 'src/topics/topics.service';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Test.name, schema: TestSchema },
      { name: Topic.name, schema: TopicSchema },
    ]),
  ],
  controllers: [TestsController],
  providers: [TestsService, TopicsService],
})
export class TestsModule {}
