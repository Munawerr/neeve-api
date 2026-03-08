import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Content Manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'content_manager' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: ['view_content', 'edit_content'] })
  @IsArray()
  @IsNotEmpty()
  permissions: string[];
}