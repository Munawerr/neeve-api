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

  async findAllTests(
    subjectId: string,
    topicId: string,
  ): Promise<{ mockTests: Test[]; otherTests: Test[] }> {
    const mockTests = await this.testModel
      .find({ subject: subjectId, testType: TestType.MOCK })
      .populate('subject')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();

    const otherTests = await this.testModel
      .find({ topic: topicId, testType: { $ne: TestType.MOCK } })
      .populate('topic')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();

    return { mockTests, otherTests };
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

  async findTestsByTopic(topic: string): Promise<Test[]> {
    return this.testModel
      .find({ topic })
      .populate('topic')
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

  // Find tests by subject
  async findTestsBySubject(subject: string): Promise<Test[]> {
    return this.testModel
      .find({
        subject,
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
