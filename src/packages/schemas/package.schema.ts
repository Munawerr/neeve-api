import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema()
export class Package extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  course: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Class' })
  class: mongoose.Schema.Types.ObjectId;

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
