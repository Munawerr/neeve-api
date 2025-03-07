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
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { FilesService } from 'src/files/files.service';
import { File, FileSchema } from 'src/files/schemas/file.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Test.name, schema: TestSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Package.name, schema: PackageSchema },
      { name: File.name, schema: FileSchema },
    ]),
  ],
  controllers: [TestsController],
  providers: [TestsService, TopicsService, QuestionsService, FilesService],
})
export class TestsModule {}
