import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInstituteUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  zip: string;

  @ApiProperty({ example: 'Software Developer' })
  @IsString()
  bio: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  instituteRegNo: string;

  @ApiProperty({ example: ['package1', 'package2'] })
  readonly packages: string[];
}
