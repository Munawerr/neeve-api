import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Package extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  course: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Class' })
  class: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    validate: [arrayLimit, '{PATH} exceeds the limit of 15'],
  })
  subjects: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true })
  code: string;

  @Prop()
  description: string;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

function arrayLimit(val: unknown): boolean {
  if (!Array.isArray(val)) {
    return false;
  }

  return val.length <= 15;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
