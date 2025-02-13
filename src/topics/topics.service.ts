import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Topic } from './schemas/topic.schema';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name)
    private topicModel: Model<Topic>,
  ) {}

  async create(createTopicDto: CreateTopicDto): Promise<Topic> {
    const createdTopic = new this.topicModel(createTopicDto);
    return createdTopic.save();
  }

  findAll(): Promise<Topic[]> {
    return this.topicModel.find().populate('subTopics').exec();
  }

  findOne(id: string): Promise<Topic | null> {
    return this.topicModel
      .findById(id)
      .populate('subTopics')
      .populate('studyNotes')
      .populate('studyPlans')
      .populate('practiceProblems')
      .exec();
  }

  findAllBySubjectAndInstitute(
    subject: string,
    institute: string,
  ): Promise<Topic[]> {
    return this.topicModel
      .find({ subject, institute })
      .populate('subTopics')
      .exec();
  }

  update(id: string, updateTopicDto: UpdateTopicDto): Promise<Topic | null> {
    return this.topicModel
      .findByIdAndUpdate(id, updateTopicDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Topic | null> {
    return this.topicModel.findByIdAndDelete(id).exec();
  }
}
