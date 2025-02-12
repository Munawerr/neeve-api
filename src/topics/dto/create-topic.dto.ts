import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateTopicDto {
  @ApiProperty({ example: 'CH101' })
  readonly code: string;

  @ApiProperty({ example: 'Introduction to Chemistry' })
  readonly title: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly subject: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
  readonly createdBy: Types.ObjectId;
}
