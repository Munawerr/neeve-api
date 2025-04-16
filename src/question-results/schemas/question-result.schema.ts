import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Option {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  isCorrect: boolean;

  @Prop({ required: true })
  isChecked: boolean;
}

@Schema()
export class QuestionResult extends Document {
  @Prop({ required: true })
  questionText: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: [Option], required: true })
  options: Option[];

  @Prop({ type: Boolean, default: false })
  skipped: boolean;

  @Prop({ required: false })
  corAnsExp: string;
}

export const QuestionResultSchema =
  SchemaFactory.createForClass(QuestionResult);
