import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Option {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  isCorrect: boolean;
}

@Schema()
export class Question extends Document {
  @Prop({ required: true })
  text: string;

  @Prop()
  corAnsExp: string;

  @Prop({ type: [{ text: String, isCorrect: Boolean }], required: true })
  options: Option[];
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
