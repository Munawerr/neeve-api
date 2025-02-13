import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateSubTopicDto {
  @ApiProperty({ example: 'SC101' })
  readonly code: string;

  @ApiProperty({ example: 'Introduction to Organic Chemistry' })
  readonly title: string;

  @ApiProperty({
    example: ['https://example.com/intro1', 'https://example.com/intro2'],
  })
  readonly introVideoUrls: string[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109cc', '60d0fe4f5311236168a109cd'],
  })
  readonly studyNotes: Types.ObjectId[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109ce', '60d0fe4f5311236168a109cf'],
  })
  readonly studyPlans: Types.ObjectId[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109d0', '60d0fe4f5311236168a109d1'],
  })
  readonly practiceProblems: Types.ObjectId[];
}
