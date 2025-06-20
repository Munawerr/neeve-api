import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Role extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ default: false })
  unlisted: boolean;

  @Prop({ required: true, type: [String] })
  permissions: string[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
