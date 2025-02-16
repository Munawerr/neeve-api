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

  @Prop({ required: true })
  corAnsExp: string;

  @Prop({ type: [{ text: String, isCorrect: Boolean }], required: true })
  options: Option[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Test', required: true })
  test: MongooseSchema.Types.ObjectId;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
