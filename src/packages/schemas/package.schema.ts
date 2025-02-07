import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Course } from '../../courses/schemas/course.schema';
import { Class } from '../../classes/schemas/class.schema';
import { Subject } from '../../subjects/schemas/subject.schema';

@Schema()
export class Package extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Course' })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  class: Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    validate: [arrayLimit, '{PATH} exceeds the limit of 6'],
  })
  subjects: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true })
  code: string;

  @Prop()
  description: string;
}

function arrayLimit(val) {
  return val.length <= 6;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
