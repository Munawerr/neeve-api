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

  findAll(): Promise<Class[]> {
    return this.classModel.find().exec();
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
