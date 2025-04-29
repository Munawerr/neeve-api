import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Object, required: true })
  color: {
    solid: string;
    accent: string;
  };

  @Prop({ required: true })
  iconUrl: string;

  @Prop({ type: String, default: 'active' })
  status: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
