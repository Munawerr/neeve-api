import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Assignment extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true })
  subject: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true })
  package: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  institute: mongoose.Schema.Types.ObjectId;

  /** File URLs stored as an array; the form accepts comma-separated input. */
  @Prop({ type: [String], default: [] })
  fileUrls: string[];

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

// Efficient look-ups by subject+package combination
AssignmentSchema.index({ subject: 1, package: 1 });
