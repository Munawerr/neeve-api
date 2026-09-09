import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class LiveClassAttendance extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'LiveClass',
    required: true,
  })
  liveClass: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  student: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  institute: MongooseSchema.Types.ObjectId;

  // Snapshot of the student's details at the time they joined, so reports can
  // show complete student information without depending on the user record still existing.
  @Prop({ required: true })
  studentName: string;

  @Prop()
  studentPhone: string;

  @Prop()
  studentRegNo: string;

  @Prop()
  studentEmail: string;

  // The timestamp recorded when the student first joined (marked present).
  @Prop({ type: Date, required: true })
  joinedAt: Date;

  // The last time the student reopened / re-joined the class within the window.
  @Prop({ type: Date })
  lastJoinedAt: Date;

  // Count of how many times the student opened the class (re-joins included).
  @Prop({ default: 1 })
  joinCount: number;
}

export const LiveClassAttendanceSchema =
  SchemaFactory.createForClass(LiveClassAttendance);

// Enforce a single attendance record per student per live class.
LiveClassAttendanceSchema.index({ liveClass: 1, student: 1 }, { unique: true });

// Optimize attendance listing and reporting by institute and live class.
LiveClassAttendanceSchema.index({ liveClass: 1, joinedAt: -1 });
LiveClassAttendanceSchema.index({ institute: 1, joinedAt: -1 });
