import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { Topic, TopicSchema } from './schemas/topic.schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { File, FileSchema } from 'src/files/schemas/file.schema';
import { FilesService } from 'src/files/files.service';
import { Test, TestSchema } from 'src/tests/schemas/test.schema';
import { Result, ResultSchema } from 'src/results/schemas/result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Package.name, schema: PackageSchema },
      { name: File.name, schema: FileSchema },
      { name: Test.name, schema: TestSchema },
      { name: Result.name, schema: ResultSchema },
    ]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService, FilesService],
})
export class TopicsModule {}
