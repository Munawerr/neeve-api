import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentUserDto {
  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  @IsOptional()
  institute?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: ['package1', 'package2'] })
  readonly packages: string[];
}
