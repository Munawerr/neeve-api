import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportAccessGuard } from './guards/report-access.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { FilterReportDto } from './dto/filter-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { ReportType, ReportFormat } from './schemas/report.schema';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, ReportAccessGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new report' })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report created successfully',
    type: ReportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createReportDto: CreateReportDto, @Req() req: Request) {
    try {
      const token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      const decoded = token
        ? (jwt.verify(token, process.env.JWT_SECRET as string) as any)
        : null;

      const userId = decoded.sub;

      const report = await this.reportsService.create(createReportDto, userId);

      return {
        status: HttpStatus.CREATED,
        message: 'Report created successfully',
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create report');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  async findAll(
    @Query() filterReportDto: FilterReportDto,
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      const decoded = token
        ? (jwt.verify(token, process.env.JWT_SECRET as string) as any)
        : null;
      const userId = decoded.sub;
      const isAdmin = decoded.role === 'admin';

      const { reports, total } = await this.reportsService.findAll(
        filterReportDto,
        userId,
        isAdmin,
        page,
        limit,
        search,
      );

      return {
        status: HttpStatus.OK,
        message: 'Reports retrieved successfully',
        data: { items: reports, total },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to retrieve reports',
      );
    }
  }

  @Get('/types')
  @ApiOperation({ summary: 'Get all report types and formats' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report types and formats retrieved successfully',
  })
  getReportTypes() {
    return {
      status: HttpStatus.OK,
      message: 'Report types and formats retrieved successfully',
      data: {
        types: Object.values(ReportType).filter(
          (type) => ![ReportType.PACKAGE].includes(type),
        ),
        formats: Object.values(ReportFormat).filter(
          (format) => format !== ReportFormat.EXCEL,
        ),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by ID' })
  @ApiParam({ name: 'id', required: true, description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report retrieved successfully',
    type: ReportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report not found',
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      const decoded = token
        ? (jwt.verify(token, process.env.JWT_SECRET as string) as any)
        : null;

      const userId = decoded.sub;
      const isAdmin = decoded.role === 'admin';

      const report = await this.reportsService.findOne(id, userId, isAdmin);

      return {
        status: HttpStatus.OK,
        message: 'Report retrieved successfully',
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to retrieve report',
      );
    }
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an existing report' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Report ID to regenerate',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report regeneration initiated successfully',
    type: ReportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to regenerate this report',
  })
  async regenerate(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      const decoded = token
        ? (jwt.verify(token, process.env.JWT_SECRET as string) as any)
        : null;

      const userId = decoded.sub;
      const isAdmin = decoded.role === 'admin';

      const report = await this.reportsService.regenerate(id, userId, isAdmin);

      return {
        status: HttpStatus.OK,
        message: 'Report regeneration initiated successfully',
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to regenerate report',
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiParam({ name: 'id', required: true, description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this report',
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      const decoded = token
        ? (jwt.verify(token, process.env.JWT_SECRET as string) as any)
        : null;

      const userId = decoded.sub;
      const isAdmin = decoded.role === 'admin';

      await this.reportsService.remove(id, userId, isAdmin);

      return {
        status: HttpStatus.OK,
        message: 'Report deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to delete report');
    }
  }
}
