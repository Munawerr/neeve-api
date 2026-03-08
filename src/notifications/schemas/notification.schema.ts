import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum NotificationType {
  DISCUSSION_ADDED = 'DISCUSSION_ADDED',
  // Other notification types can be added here in the future
}

export enum RecipientType {
  USER = 'USER',
  INSTITUTE = 'INSTITUTE',
}

@Schema()
export class Notification extends Document {
  @Prop({ 
    type: String, 
    enum: Object.values(NotificationType), 
    required: true 
  })
  type: NotificationType;

  @Prop({ 
    type: String, 
    enum: Object.values(RecipientType), 
    required: true 
  })
  recipientType: RecipientType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'recipientType', required: true })
  recipient: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: false })
  thread: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', required: false })
  discussion: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);