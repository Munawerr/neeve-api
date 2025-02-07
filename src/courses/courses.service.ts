import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(@InjectModel(Course.name) private courseModel: Model<Course>) {}

  create(createCourseDto: CreateCourseDto): Promise<Course> {
    const createdCourse = new this.courseModel(createCourseDto);
    return createdCourse.save();
  }

  findAll(): Promise<Course[]> {
    return this.courseModel.find().exec();
  }

  findOne(id: string): Promise<Course | null> {
    return this.courseModel.findById(id).exec();
  }

  findByIds(ids: string[]): Promise<Course[]> {
    return this.courseModel.find({ _id: { $in: ids } }).exec();
  }

  update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course | null> {
    return this.courseModel
      .findByIdAndUpdate(id, updateCourseDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Course | null> {
    return this.courseModel.findByIdAndDelete(id).exec();
  }
}
