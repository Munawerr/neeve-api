import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result } from './schemas/result.schema';
import { CreateResultServiceDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

@Injectable()
export class ResultsService {
  constructor(@InjectModel(Result.name) private resultModel: Model<Result>) {}

  async create(createResultDto: CreateResultServiceDto): Promise<Result> {
    const createdResult = new this.resultModel(createResultDto);
    return createdResult.save();
  }

  async findAll(): Promise<Result[]> {
    return this.resultModel.find().exec();
  }

  async findOne(id: string): Promise<Result | null> {
    return this.resultModel.findById(id).exec();
  }

  async update(
    id: string,
    updateResultDto: UpdateResultDto,
  ): Promise<Result | null> {
    return this.resultModel
      .findByIdAndUpdate(id, updateResultDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.resultModel.findByIdAndDelete(id).exec();
  }
}
