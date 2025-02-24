import { ApiProperty } from '@nestjs/swagger';

export class UpdateLiveClassDto {
  @ApiProperty({ example: 'Math Live Class' })
  readonly title: string;

  @ApiProperty({ example: '2023-10-01' })
  readonly date: Date;

  @ApiProperty({ example: '10:00' })
  readonly startTime: string;

  @ApiProperty({ example: '12:00' })
  readonly endTime: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  readonly package: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  readonly subject: string;

  @ApiProperty({ example: 'https://live-session-url.com' })
  readonly liveSessionUrl?: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  readonly institute: string;
}
