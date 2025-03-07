import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { Topic, TopicSchema } from './schemas/topic.schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { File, FileSchema } from 'src/files/schemas/file.schema';
import { FilesService } from 'src/files/files.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Package.name, schema: PackageSchema },
      { name: File.name, schema: FileSchema },
    ]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService, FilesService],
})
export class TopicsModule {}
