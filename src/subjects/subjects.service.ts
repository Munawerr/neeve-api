import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject } from './schemas/subject.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
  ) {}

  create(createSubjectDto: CreateSubjectDto): Promise<Subject> {
    const createdSubject = new this.subjectModel(createSubjectDto);
    return createdSubject.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ subjects: Subject[]; total: number }> {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const subjects = await this.subjectModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.subjectModel.countDocuments(filter);
    return { subjects, total };
  }

  findOne(id: string): Promise<Subject | null> {
    return this.subjectModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<Subject[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }
    const result = await this.subjectModel.find({ _id: { $in: ids } }).exec();
    return result;
  }

  update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<Subject | null> {
    return this.subjectModel
      .findByIdAndUpdate(id, updateSubjectDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Subject | null> {
    return this.subjectModel.findByIdAndDelete(id).exec();
  }
}
