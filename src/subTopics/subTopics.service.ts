import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubTopic } from './schemas/subTopic.schema';
import { CreateSubTopicDto } from './dto/create-subTopic.dto';
import { UpdateSubTopicDto } from './dto/update-subTopic.dto';

@Injectable()
export class SubTopicsService {
  constructor(
    @InjectModel(SubTopic.name) private subTopicModel: Model<SubTopic>,
  ) {}

  create(createSubTopicDto: CreateSubTopicDto): Promise<SubTopic> {
    const createdSubTopic = new this.subTopicModel(createSubTopicDto);
    return createdSubTopic.save();
  }

  findAll(): Promise<SubTopic[]> {
    return this.subTopicModel.find().exec();
  }

  findOne(id: string): Promise<SubTopic | null> {
    return this.subTopicModel.findById(id).exec();
  }

  update(
    id: string,
    updateSubTopicDto: UpdateSubTopicDto,
  ): Promise<SubTopic | null> {
    return this.subTopicModel
      .findByIdAndUpdate(id, updateSubTopicDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<SubTopic | null> {
    return this.subTopicModel.findByIdAndDelete(id).exec();
  }
}
