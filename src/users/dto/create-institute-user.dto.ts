import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateInstituteUserDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  city: string;

  @IsString()
  zip: string;

  @IsString()
  bio: string;

  @IsString()
  instituteRegNo: string;

  readonly packages: string[];
}
