import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ResultStatus } from './schemas/result.schema';
import { CreateResultServiceDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

@Injectable()
export class ResultsService {
  constructor(@InjectModel(Result.name) private resultModel: Model<Result>) {}

  // Create a new result
  async create(createResultDto: CreateResultServiceDto): Promise<Result> {
    const createdResult = new this.resultModel(createResultDto);
    return createdResult.save();
  }

  // Find all results
  async findAll(): Promise<Result[]> {
    return this.resultModel.find().exec();
  }

  // Find a result by ID
  async findOne(id: string): Promise<Result | null> {
    return this.resultModel
      .findById(id)
      .populate('test')
      .populate('subject')
      .populate('institute')
      .populate('student')
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find all results for a student
  async findAllByStudentId(student: string): Promise<Result[]> {
    return this.resultModel
      .find({ student })
      .populate('test')
      .populate('subject')
      .populate('institute')
      .populate('student')
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find finished results for a student, subject, and test type
  async findFinishedResults(
    student: string,
    subject: string,
    testType: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({
        student,
        subject,
        status: ResultStatus.FINISHED,
      })
      .populate({
        path: 'test',
        model: 'Test',
        match: { testType },
        populate: [{ path: 'topic', model: 'Topic' }],
      })
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find finished results for a student and test type
  async findFinishedResultsByStudentAndTestType(
    student: string,
    testType: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({
        student,
        status: ResultStatus.FINISHED,
      })
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Update a result by ID
  async update(
    id: string,
    updateResultDto: UpdateResultDto,
  ): Promise<Result | null> {
    return this.resultModel
      .findByIdAndUpdate(id, updateResultDto, { new: true })
      .exec();
  }

  // Remove a result by ID
  async remove(id: string): Promise<void> {
    await this.resultModel.findByIdAndDelete(id).exec();
  }
}
