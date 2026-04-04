import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';
import { Test, TestSchema } from 'src/tests/schemas/test.schema';
import {
  LiveClass,
  LiveClassSchema,
} from 'src/liveClasses/schemas/liveClass.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name, schema: SubjectSchema },
      { name: Package.name, schema: PackageSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Test.name, schema: TestSchema },
      { name: LiveClass.name, schema: LiveClassSchema },
    ]),
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
