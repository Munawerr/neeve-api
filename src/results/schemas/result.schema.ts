import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export enum ResultStatus {
  FINISHED = 'finished',
  NOT_FINISHED = 'not_finished',
}

@Schema()
export class Result extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Test', required: true })
  test: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  institute: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  student: MongooseSchema.Types.ObjectId;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'QuestionResult' })
  questionResults: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ required: true })
  finishedAt: Date;

  @Prop({ required: true, enum: ResultStatus })
  status: ResultStatus;

  @Prop({ required: true })
  numOfQuestions: number;

  @Prop({ required: true })
  marksPerQuestion: number;
}

export const ResultSchema = SchemaFactory.createForClass(Result);
