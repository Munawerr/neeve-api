import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateTopicDto {
  @ApiPropertyOptional({ example: 'CH101' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'Introduction to Chemistry' })
  readonly title?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  readonly subject?: Types.ObjectId;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109cb' })
  readonly createdBy?: Types.ObjectId;
}
