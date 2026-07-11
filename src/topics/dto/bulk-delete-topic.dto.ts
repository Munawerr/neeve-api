import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BulkDeleteTopicDto {
  @ApiProperty({
    example: ['60d0fe4f5311236168a109ca', '60d0fe4f5311236168a109cb'],
    description: 'Array of topic IDs to delete',
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
