import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Class extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;
}

export const ClassSchema = SchemaFactory.createForClass(Class);
