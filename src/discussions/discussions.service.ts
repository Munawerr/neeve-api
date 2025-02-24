import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Discussion } from './schemas/discussion.schema';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectModel(Discussion.name) private discussionModel: Model<Discussion>,
  ) {}

  create(createDiscussionDto: CreateDiscussionDto): Promise<Discussion> {
    const createdDiscussion = new this.discussionModel(createDiscussionDto);
    return createdDiscussion.save();
  }

  findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<Discussion[]> {
    const skip = (page - 1) * limit;
    const query = search ? { content: { $regex: search, $options: 'i' } } : {};
    return this.discussionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('thread')
      .populate('user')
      .exec();
  }

  findOne(id: string): Promise<Discussion | null> {
    return this.discussionModel
      .findById(id)
      .populate('thread')
      .populate('user')
      .exec();
  }

  update(
    id: string,
    updateDiscussionDto: UpdateDiscussionDto,
  ): Promise<Discussion | null> {
    return this.discussionModel
      .findByIdAndUpdate(id, updateDiscussionDto, { new: true })
      .exec();
  }

  async markAsDeleted(id: string): Promise<Discussion | null> {
    return this.discussionModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
  }

  remove(id: string): Promise<Discussion | null> {
    return this.markAsDeleted(id);
  }
}
