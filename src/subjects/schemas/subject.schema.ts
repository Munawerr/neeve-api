import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Subject extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Object, required: true })
  color: {
    solid: string;
    accent: string;
  };

  @Prop({ type: String })
  iconUrl?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
