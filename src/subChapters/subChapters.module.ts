import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubChaptersController } from './subChapters.controller';
import { SubChaptersService } from './subChapters.service';
import { SubChapter, SubChapterSchema } from './schemas/subChapter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SubChapter.name, schema: SubChapterSchema }]),
  ],
  controllers: [SubChaptersController],
  providers: [SubChaptersService],
})
export class SubChaptersModule {}
