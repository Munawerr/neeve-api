import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType, RecipientType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.DISCUSSION_ADDED,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    enum: RecipientType,
    description: 'Type of recipient',
    example: RecipientType.USER,
  })
  @IsEnum(RecipientType)
  @IsNotEmpty()
  recipientType: RecipientType;

  @ApiProperty({
    description: 'ID of the recipient',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({
    description: 'Thread ID associated with this notification',
    example: '60d21b4667d0d8992e610c85',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  thread?: string;

  @ApiProperty({
    description: 'Discussion ID associated with this notification',
    example: '60d21b4667d0d8992e610c85',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  discussion?: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'New discussion added to your thread',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}