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

  findAll(): Promise<Subject[]> {
    return this.subjectModel.find().exec();
  }

  findOne(id: string): Promise<Subject | null> {
    return this.subjectModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<Subject[]> {
    return this.subjectModel.find({ _id: { $in: ids } }).exec();
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
