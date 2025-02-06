import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';
import { Class } from '../../classes/schemas/class.schema';
import { Subject } from '../../subjects/schemas/subject.schema';

@Schema()
export class Package extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Course' })
  course: Course;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  class: Class;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }], validate: [arrayLimit, '{PATH} exceeds the limit of 6'] })
  subjects: Subject[];

  @Prop({ required: true })
  code: string;

  @Prop()
  description: string;
}

function arrayLimit(val) {
  return val.length <= 6;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
