import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateTopicDto {
  @ApiProperty({ example: 'CH101' })
   code: string;

  @ApiProperty({ example: 'Introduction to Chemistry' })
   title: string;

  @ApiProperty({
    example:
      'Chemistry is a science subject and is a mandatory subject all over the world',
  })
   description: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
   subject?: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
   package?: Types.ObjectId;

  @ApiProperty({
    example: ['https://example.com/intro1', 'https://example.com/intro2'],
  })
   introVideoUrls?: string[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109cc', '60d0fe4f5311236168a109cd'],
  })
   studyNotes?: Types.ObjectId[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109ce', '60d0fe4f5311236168a109cf'],
  })
   studyPlans?: Types.ObjectId[];

  @ApiProperty({
    example: ['60d0fe4f5311236168a109d0', '60d0fe4f5311236168a109d1'],
  })
   practiceProblems?: Types.ObjectId[];

   isParent?: boolean;
}
