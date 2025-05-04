import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ActivityType {
  RESOURCE_VIEW = 'resource_view',
  VIDEO_WATCH = 'video_watch',
}

@Schema({ timestamps: true })
export class Analytics extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  instituteId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Topic', required: true })
  topicId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, enum: ActivityType })
  activityType: ActivityType;

  @Prop({ type: String, required: true })
  resourceId: string;

  @Prop({ type: String })
  resourceName: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);
