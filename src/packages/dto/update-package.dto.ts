import { ApiProperty } from '@nestjs/swagger';

export class UpdatePackageDto {
  @ApiProperty({ example: 'Math101' })
  readonly course: string;

  @ApiProperty({ example: 'ClassA' })
  readonly class: string;

  @ApiProperty({ example: ['Math', 'Science'] })
  readonly subjects: string[];

  @ApiProperty({ example: 'PKG001' })
  readonly code: string;

  @ApiProperty({ example: 'This is a package description.' })
  readonly description: string;
}
