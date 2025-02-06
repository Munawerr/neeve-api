import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  instituteRegNo?: string;

  @IsOptional()
  @IsString()
  packageCode?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  readonly bio?: string;
  // Add other profile fields as needed
}
