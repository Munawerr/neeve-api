import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Package } from 'src/packages/schemas/package.schema';

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema()
export class User extends Document {
  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ required: true })
  lastLogin: Date;

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
  dob: string;

  @Prop()
  phone: string;

  @Prop()
  regNo: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  institute: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Package' }] })
  packages: Package[];

  @Prop()
  coverUrl: string;

  @Prop()
  imageUrl: string;

  @Prop()
  bio: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
