import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class SubChapter extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop([String])
  introVideoUrls: string[];

  @Prop([String])
  studyNotesUrls: string[];

  @Prop([String])
  studyPlansUrls: string[];

  @Prop([String])
  practiceProblemsUrls: string[];
}

export const SubChapterSchema = SchemaFactory.createForClass(SubChapter);
