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

  @Prop()
  iconUrl?: string;

  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
