import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpStatus,
  SetMetadata,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LiveClassesService } from './liveClasses.service';
import { CreateLiveClassDto } from './dto/create-liveClass.dto';
import { UpdateLiveClassDto } from './dto/update-liveClass.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@ApiTags('liveClasses')
@Controller('live-classes')
@UseGuards(JwtAuthGuard)
export class LiveClassesController {
  constructor(private readonly liveClassesService: LiveClassesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new live class' })
  @ApiBody({ type: CreateLiveClassDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class created successfully',
  })
  @SetMetadata('permissions', ['edit_live_classes'])
  async create(@Body() createLiveClassDto: CreateLiveClassDto) {
    const liveClass = await this.liveClassesService.create(createLiveClassDto);
    return {
      status: HttpStatus.OK,
      message: 'Live class created successfully',
      data: liveClass,
    };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all live classes' })
  @ApiQuery({ name: 'institute', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live classes retrieved successfully',
  })
  @SetMetadata('permissions', ['view_live_classes'])
  async findAll(
    @Query('institute') institute: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Req() req: Request,
  ) {
    try {
      const requester = req.user as
        | { userId?: string; role?: string }
        | undefined;
      const { liveClasses, total } =
        await this.liveClassesService.findAllWithPaging(
          institute,
          page,
          limit,
          search,
          requester?.role,
          requester?.userId,
        );
      return {
        status: HttpStatus.OK,
        message: 'Live classes retrieved successfully',
        data: { items: liveClasses, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve live classes',
        error: error.message,
      };
    }
  }

  @Get('count/upcoming')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of upcoming live classes' })
  @ApiQuery({ name: 'institute', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Count of upcoming live classes retrieved successfully',
  })
  @SetMetadata('permissions', ['view_live_classes'])
  async getUpcomingLiveClassesCount(
    @Query('institute') institute: string,
    @Req() req: Request,
  ) {
    try {
      const requester = req.user as
        | { userId?: string; role?: string }
        | undefined;
      const count = await this.liveClassesService.countUpcomingLiveClasses(
        institute,
        requester?.role,
        requester?.userId,
      );
      return {
        status: HttpStatus.OK,
        message: 'Count of upcoming live classes retrieved successfully',
        data: { count },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve count of upcoming live classes',
        error: error.message,
      };
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a live class by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Live class not found',
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user as
      | { userId?: string; role?: string }
      | undefined;
    const liveClass = await this.liveClassesService.findOne(
      id,
      requester?.role,
    );
    if (!liveClass) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Live class not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Live class retrieved successfully',
      data: liveClass,
    };
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a live class' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateLiveClassDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class updated successfully',
  })
  @SetMetadata('permissions', ['edit_live_classes'])
  async update(
    @Param('id') id: string,
    @Body() updateLiveClassDto: UpdateLiveClassDto,
  ) {
    const updatedLiveClass = await this.liveClassesService.update(
      id,
      updateLiveClassDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Live class updated successfully',
      data: updatedLiveClass,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a live class' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class deleted successfully',
  })
  @SetMetadata('permissions', ['delete_live_classes'])
  async remove(@Param('id') id: string) {
    const result = await this.liveClassesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Live class deleted successfully',
      data: result,
    };
  }

  @Post(':id/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a live class (students only)' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class joined successfully, session link returned',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Live class is not open yet or has ended',
  })
  async join(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user as { userId?: string } | undefined;
    try {
      const result = await this.liveClassesService.joinLiveClass(
        id,
        requester?.userId || '',
      );
      return {
        status: HttpStatus.OK,
        message: 'Live class joined successfully',
        data: { liveSessionUrl: result.liveSessionUrl },
      };
    } catch (error) {
      const status =
        error?.status || error?.response?.status || HttpStatus.BAD_REQUEST;
      const message =
        error?.message || error?.response?.message || 'Failed to join live class';
      return {
        status,
        message,
        data: null,
      };
    }
  }

  @Get(':id/attendance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendance of a live class (institute/admin)' })
  @ApiParam({ name: 'id', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class attendance retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view attendance',
  })
  async getAttendance(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: Request,
  ) {
    const requester = req.user as { userId?: string } | undefined;
    try {
      const hasAccess = await this.liveClassesService.hasAttendanceAccess(
        requester?.userId || '',
        id,
      );
      if (!hasAccess) {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'You do not have permission to view attendance',
          data: null,
        };
      }
      const { attendees, total } =
        await this.liveClassesService.getAttendance(id, page, limit);
      return {
        status: HttpStatus.OK,
        message: 'Live class attendance retrieved successfully',
        data: { attendees, total },
      };
    } catch (error) {
      return {
        status:
          error?.status || error?.response?.status || HttpStatus.BAD_REQUEST,
        message:
          error?.message || error?.response?.message || 'Failed to load attendance',
        data: null,
      };
    }
  }

  @Get(':id/attendance/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download live class attendance as CSV' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class attendance CSV downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to download attendance',
  })
  async exportAttendance(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const requester = req.user as { userId?: string } | undefined;
    try {
      const hasAccess = await this.liveClassesService.hasAttendanceAccess(
        requester?.userId || '',
        id,
      );
      if (!hasAccess) {
        return res.status(HttpStatus.FORBIDDEN).json({
          status: HttpStatus.FORBIDDEN,
          message: 'You do not have permission to download attendance',
          data: null,
        });
      }

      const { liveClass, attendees } =
        await this.liveClassesService.exportAttendance(id);

      const escapeCsv = (value: any): string => {
        const str = value == null ? '' : String(value);
        if (/[",\r\n]/.test(str)) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      const lines: string[] = [];
      lines.push('KEY,VALUE');
      lines.push(
        `Live Class Title,${escapeCsv(liveClass.title)}`,
      );
      lines.push(
        `Class Date,${escapeCsv(
          new Date(liveClass.date).toLocaleDateString('en-GB'),
        )}`,
      );
      lines.push(`Start Time,${escapeCsv(liveClass.startTime)}`);
      lines.push(`End Time,${escapeCsv(liveClass.endTime)}`);
      lines.push('');
      lines.push(
        'Student Name,Phone,Reg No,Email,First Joined At,Last Joined At,Re-joins',
      );

      for (const a of attendees) {
        lines.push(
          [
            escapeCsv(a.studentName),
            escapeCsv(a.studentPhone),
            escapeCsv(a.studentRegNo),
            escapeCsv(a.studentEmail),
            escapeCsv(a.joinedAt ? new Date(a.joinedAt).toISOString() : ''),
            escapeCsv(
              a.lastJoinedAt ? new Date(a.lastJoinedAt).toISOString() : '',
            ),
            escapeCsv(a.joinCount),
          ].join(','),
        );
      }

      const csv = lines.join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=live_class_attendance_${id}.csv`,
      );
      return res.send(csv);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        message: error?.message || 'Failed to download attendance',
        data: null,
      });
    }
  }

  @Get('archive/deleted')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get deleted live classes (super admin only)' })
  async findDeleted() {
    const items = await this.liveClassesService.findDeleted();
    return {
      status: HttpStatus.OK,
      message: 'Deleted live classes retrieved successfully',
      data: { items, total: items.length },
    };
  }

  @Put(':id/restore')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restore a soft deleted live class (super admin only)',
  })
  async restore(@Param('id') id: string) {
    const item = await this.liveClassesService.restore(id);
    return {
      status: HttpStatus.OK,
      message: 'Live class restored successfully',
      data: item,
    };
  }
}
