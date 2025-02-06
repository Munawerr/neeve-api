import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Subject extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
