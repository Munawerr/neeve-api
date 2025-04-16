import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// TestResult interface for correctly typing result data
export interface TestResult {
  student: {
    id: any;
    name: any;
    email: any;
  };
  testName: string;
  subject: string;
  status: ResultStatus;
  startedAt: Date;
  finishedAt: Date;
  score: number;
  totalMarks: number;
  percentage: string;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion: string;
}

// Enum to represent the status of the result
export enum ResultStatus {
  FINISHED = 'finished',
  NOT_FINISHED = 'not_finished',
}

enum TestType {
  MOCK = 'mock',
  PRACTICE = 'practice',
  TEST = 'test',
}

@Schema()
// Schema for MarksSummary
export class MarksSummary {
  @Prop({ required: true })
  totalMarks: number;

  @Prop({ required: true })
  obtainedMarks: number;

  @Prop({ required: true })
  averageMarks: number;

  @Prop({ required: true })
  correctAnswers: number;

  @Prop({ required: true })
  incorrectAnswers: number;

  @Prop({ required: true })
  averageTimePerQuestion: number;

  @Prop({ required: true })
  skippedQuestions: number;
}

@Schema()
// Schema for Result
export class Result extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Test', required: true })
  test: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  institute: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  student: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: TestType })
  testType: TestType;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'QuestionResult' })
  questionResults: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ required: false })
  finishedAt: Date;

  @Prop({
    required: true,
    enum: ResultStatus,
    default: ResultStatus.NOT_FINISHED,
  })
  status: ResultStatus;

  @Prop({ required: true })
  numOfQuestions: number;

  @Prop({ required: true })
  marksPerQuestion: number;

  @Prop({
    type: {
      totalMarks: Number,
      obtainedMarks: Number,
      averageMarks: Number,
      correctAnswers: Number,
      incorrectAnswers: Number,
      averageTimePerQuestion: Number,
      skippedQuestions: Number,
    },
    required: false,
  })
  marksSummary: MarksSummary;
}

// Create the schema for Result
export const ResultSchema = SchemaFactory.createForClass(Result);
