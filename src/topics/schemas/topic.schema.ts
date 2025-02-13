import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Topic extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  institute: MongooseSchema.Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'SubTopic' }])
  subTopics: MongooseSchema.Types.ObjectId[];

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
