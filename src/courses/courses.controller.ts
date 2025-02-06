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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createCourseDto: CreateCourseDto) {
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
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
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
