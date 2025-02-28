import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Test, TestType } from './schemas/test.schema';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';

@Injectable()
export class TestsService {
  constructor(@InjectModel(Test.name) private testModel: Model<Test>) {}

  async create(createTestDto: CreateTestDto): Promise<Test> {
    const createdTest = new this.testModel(createTestDto);
    return createdTest.save();
  }

  async findAll(): Promise<Test[]> {
    return this.testModel.find().exec();
  }

  async findAllMockTests(subject: string): Promise<Test[]> {
    return this.testModel
      .find({ subject, testType: TestType.MOCK })
      .populate('subject')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();
  }

  async findOne(id: string): Promise<Test | null> {
    return this.testModel
      .findById(id)
      .populate('topic')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();
  }

  async update(id: string, updateTestDto: UpdateTestDto): Promise<Test | null> {
    return this.testModel
      .findByIdAndUpdate(id, updateTestDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.testModel.findByIdAndDelete(id).exec();
  }
}
