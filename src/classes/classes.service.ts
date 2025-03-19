import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Class } from './schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(@InjectModel(Class.name) private classModel: Model<Class>) {}

  create(createClassDto: CreateClassDto): Promise<Class> {
    const createdClass = new this.classModel(createClassDto);
    return createdClass.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ classes: Class[]; total: number }> {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const classes = await this.classModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.classModel.countDocuments(filter);
    return { classes, total };
  }

  findOne(id: string): Promise<Class | null> {
    return this.classModel.findById(id).exec();
  }

  update(id: string, updateClassDto: UpdateClassDto): Promise<Class | null> {
    return this.classModel
      .findByIdAndUpdate(id, updateClassDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Class | null> {
    return this.classModel.findByIdAndDelete(id).exec();
  }
}
