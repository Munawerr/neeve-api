import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.INACTIVE })
  status: UserStatus;

  @Prop()
  verificationOtp: string;

  @Prop()
  verificationToken: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Role', required: true })
  role: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  full_name: string;

  @Prop()
  city: string;

  @Prop()
  zip: string;

  @Prop()
  instituteRegNo: string;

  @Prop()
  packageCode: string;

  @Prop()
  coverUrl: string;

  @Prop()
  imageUrl: string;

  @Prop()
  bio: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
