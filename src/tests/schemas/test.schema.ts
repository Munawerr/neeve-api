import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum TestType {
  MOCK = 'mock',
  PRACTICE = 'practice',
  TEST = 'test',
  SCREENING = 'screening',
}

@Schema({ timestamps: true })
export class Test extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Topic' })
  topic: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  marksPerQuestion: number;

  @Prop({ required: true })
  testDuration: number;

  @Prop({ required: true, enum: TestType })
  testType: TestType;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Question' })
  questions: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  skipableQuestionsCount: number;
}

export const TestSchema = SchemaFactory.createForClass(Test);
