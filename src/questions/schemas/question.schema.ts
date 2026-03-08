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
  corAnsExp: string; // Correct Answer Explanation

  @Prop({
    type: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    required: true,
  })
  options: Option[];
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
