import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification created successfully',
  })
  @SetMetadata('permissions', ['create_notifications'])
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(createNotificationDto);
    return {
      status: HttpStatus.OK,
      message: 'Notification created successfully',
      data: notification,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for a user or institute' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'instituteId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
  })
  @SetMetadata('permissions', ['view_notifications'])
  async findAll(
    @Query('userId') userId?: string,
    @Query('instituteId') instituteId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const { notifications, total } = await this.notificationsService.findAll(
      userId,
      instituteId,
      page,
      limit,
    );
    return {
      status: HttpStatus.OK,
      message: 'Notifications retrieved successfully',
      data: { items: notifications, total },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Notification not found',
  })
  @SetMetadata('permissions', ['view_notifications'])
  async findOne(@Param('id') id: string) {
    const notification = await this.notificationsService.findOne(id);
    if (!notification) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Notification not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Notification retrieved successfully',
      data: notification,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateNotificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification updated successfully',
  })
  @SetMetadata('permissions', ['edit_notifications'])
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    const updatedNotification = await this.notificationsService.update(
      id,
      updateNotificationDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Notification updated successfully',
      data: updatedNotification,
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read successfully',
  })
  @SetMetadata('permissions', ['edit_notifications'])
  async markAsRead(@Param('id') id: string) {
    const updatedNotification = await this.notificationsService.markAsRead(id);
    return {
      status: HttpStatus.OK,
      message: 'Notification marked as read successfully',
      data: updatedNotification,
    };
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'instituteId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read successfully',
  })
  @SetMetadata('permissions', ['edit_notifications'])
  async markAllAsRead(
    @Query('userId') userId?: string,
    @Query('instituteId') instituteId?: string,
  ) {
    await this.notificationsService.markAllAsRead(userId, instituteId);
    return {
      status: HttpStatus.OK,
      message: 'All notifications marked as read successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification deleted successfully',
  })
  @SetMetadata('permissions', ['delete_notifications'])
  async remove(@Param('id') id: string) {
    await this.notificationsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Notification deleted successfully',
    };
  }
}