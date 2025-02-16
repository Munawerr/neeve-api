import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QuestionResult } from './schemas/question-result.schema';
import { CreateQuestionResultDto } from './dto/create-question-result.dto';
import { UpdateQuestionResultDto } from './dto/update-question-result.dto';

@Injectable()
export class QuestionResultsService {
  constructor(
    @InjectModel(QuestionResult.name)
    private questionResultModel: Model<QuestionResult>,
  ) {}

  async create(
    createQuestionResultDto: CreateQuestionResultDto,
  ): Promise<QuestionResult> {
    const createdQuestionResult = new this.questionResultModel(
      createQuestionResultDto,
    );
    return createdQuestionResult.save();
  }

  async findAll(): Promise<QuestionResult[]> {
    return this.questionResultModel.find().exec();
  }

  async findOne(id: string): Promise<QuestionResult | null> {
    return this.questionResultModel.findById(id).exec();
  }

  async update(
    id: string,
    updateQuestionResultDto: UpdateQuestionResultDto,
  ): Promise<QuestionResult | null> {
    return this.questionResultModel
      .findByIdAndUpdate(id, updateQuestionResultDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.questionResultModel.findByIdAndDelete(id).exec();
  }
}
