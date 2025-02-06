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

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('icon'))
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
  async remove(@Param('id') id: string) {
    await this.coursesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Course deleted successfully',
    };
  }
}
