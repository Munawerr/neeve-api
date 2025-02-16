import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { Test, TestSchema } from './schemas/test.schema';
import { TopicsService } from 'src/topics/topics.service';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';
import {
  Question,
  QuestionSchema,
} from 'src/questions/schemas/question.schema';
import { QuestionsService } from 'src/questions/questions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Test.name, schema: TestSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [TestsController],
  providers: [TestsService, TopicsService, QuestionsService],
})
export class TestsModule {}
