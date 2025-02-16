import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Topic extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: true })
  isParent: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject' })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  institute: MongooseSchema.Types.ObjectId;

  @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'Topic' }])
  subTopics: MongooseSchema.Types.ObjectId[];

  @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'Test' }])
  tests: MongooseSchema.Types.ObjectId[];

  @Prop([String])
  introVideoUrls: string[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'File' })
  studyNotes: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'File' })
  studyPlans: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'File' })
  practiceProblems: MongooseSchema.Types.ObjectId[];
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
