import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubChapter } from './schemas/subChapter.schema';
import { CreateSubChapterDto } from './dto/create-subChapter.dto';
import { UpdateSubChapterDto } from './dto/update-subChapter.dto';

@Injectable()
export class SubChaptersService {
  constructor(
    @InjectModel(SubChapter.name) private subChapterModel: Model<SubChapter>,
  ) {}

  create(createSubChapterDto: CreateSubChapterDto): Promise<SubChapter> {
    const createdSubChapter = new this.subChapterModel(createSubChapterDto);
    return createdSubChapter.save();
  }

  findAll(): Promise<SubChapter[]> {
    return this.subChapterModel.find().exec();
  }

  findOne(id: string): Promise<SubChapter | null> {
    return this.subChapterModel.findById(id).exec();
  }

  update(
    id: string,
    updateSubChapterDto: UpdateSubChapterDto,
  ): Promise<SubChapter | null> {
    return this.subChapterModel
      .findByIdAndUpdate(id, updateSubChapterDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<SubChapter | null> {
    return this.subChapterModel.findByIdAndDelete(id).exec();
  }
}
