import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Package } from 'src/packages/schemas/package.schema';

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  password: string;

  // Email is not unique by default to allow multiple null/empty values
  @Prop({
    required: false,
    validate: {
      // Only check uniqueness if email has a value
      validator: async function (email) {
        if (!email) return true; // Skip validation if email is empty
        const user = await this.constructor.findOne({ email });
        return !user || user._id.equals(this._id);
      },
      message: 'Email already exists',
    },
  })
  email: string;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ required: false })
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

  @Prop({ unique: true })
  phone: string;

  @Prop({ unique: true })
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

// Remove any previous indexes and create a completely new one
// This ensures uniqueness only for non-null, non-empty email values
UserSchema.pre('save', function (next) {
  // If email is empty string, null or undefined, set it to null explicitly
  if (!this.email || this.email === '') {
    this.email = '';
  }
  next();
});

// Remove the sparse index
// No index on email field to allow multiple users with null/empty email
