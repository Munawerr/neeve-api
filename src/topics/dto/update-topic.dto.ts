import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateTopicDto {
  @ApiPropertyOptional({ example: 'CH101' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'Introduction to Chemistry' })
  readonly title?: string;

  @ApiPropertyOptional({
    example:
      'Chemistry is a science subject and is a mandatory subject all over the world',
  })
  readonly description?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  readonly subject?: Types.ObjectId;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109cb' })
  readonly package?: Types.ObjectId;

  @ApiPropertyOptional({
    example: ['https://example.com/intro1', 'https://example.com/intro2'],
  })
  readonly introVideoUrls?: string[];

  @ApiPropertyOptional({
    example: ['60d0fe4f5311236168a109cc', '60d0fe4f5311236168a109cd'],
  })
  readonly studyNotes?: Types.ObjectId[];

  @ApiPropertyOptional({
    example: ['60d0fe4f5311236168a109ce', '60d0fe4f5311236168a109cf'],
  })
  readonly studyPlans?: Types.ObjectId[];

  @ApiPropertyOptional({
    example: ['60d0fe4f5311236168a109d0', '60d0fe4f5311236168a109d1'],
  })
  readonly practiceProblems?: Types.ObjectId[];
}
