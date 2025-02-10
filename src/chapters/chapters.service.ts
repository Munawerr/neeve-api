import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chapter } from './schemas/chapter.schema';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectModel(Chapter.name)
    private chapterModel: Model<Chapter>,
  ) {}

  async create(createChapterDto: CreateChapterDto): Promise<Chapter> {
    const createdChapter = new this.chapterModel(createChapterDto);
    return createdChapter.save();
  }

  findAll(): Promise<Chapter[]> {
    return this.chapterModel.find().exec();
  }

  findOne(id: string): Promise<Chapter | null> {
    return this.chapterModel.findById(id).exec();
  }

  findAllBySubjectAndInstitute(
    subject: string,
    institute: string,
  ): Promise<Chapter[]> {
    return this.chapterModel.find({ subject, institute }).exec();
  }

  update(
    id: string,
    updateChapterDto: UpdateChapterDto,
  ): Promise<Chapter | null> {
    return this.chapterModel
      .findByIdAndUpdate(id, updateChapterDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Chapter | null> {
    return this.chapterModel.findByIdAndDelete(id).exec();
  }
}
