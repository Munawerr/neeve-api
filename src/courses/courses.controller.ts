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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { S3Service } from '../s3/s3.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('icon'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course created successfully' })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      const iconUrl = await this.s3Service.uploadFile(file);
      createCourseDto.iconUrl = iconUrl;
    }
    const course = await this.coursesService.create(createCourseDto);
    return {
      status: HttpStatus.OK,
      message: 'Course created successfully',
      data: course,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses retrieved successfully' })
  async findAll() {
    const courses = await this.coursesService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Courses retrieved successfully',
      data: courses,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course retrieved successfully' })
  @ApiResponse({ status: HttpStatus.EXPECTATION_FAILED, description: 'Course not found' })
  async findOne(@Param('id') id: string) {
    const course = await this.coursesService.findOne(id);
    if (!course) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Course not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Course retrieved successfully',
      data: course,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('icon'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      const iconUrl = await this.s3Service.uploadFile(file);
      updateCourseDto.iconUrl = iconUrl;
    }
    const updatedCourse = await this.coursesService.update(id, updateCourseDto);
    return {
      status: HttpStatus.OK,
      message: 'Course updated successfully',
      data: updatedCourse,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.coursesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Course deleted successfully',
    };
  }
}
