import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  readonly email: string;

  @ApiProperty({ example: 'password123' })
  readonly password: string;
}
