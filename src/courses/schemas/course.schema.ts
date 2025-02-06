import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Course extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
