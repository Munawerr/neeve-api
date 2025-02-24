import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class LiveClass extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true,
  })
  package: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  })
  subject: mongoose.Schema.Types.ObjectId;

  @Prop({ required: false })
  liveSessionUrl: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
  })
  institute: mongoose.Schema.Types.ObjectId;
}

export const LiveClassSchema = SchemaFactory.createForClass(LiveClass);
