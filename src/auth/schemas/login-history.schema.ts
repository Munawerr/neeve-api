import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class LoginHistory extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop()
  email: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ default: Date.now })
  loginTime: Date;

  @Prop()
  location: string;

  @Prop()
  deviceInfo: string;

  @Prop({ default: true })
  success: boolean;
}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);