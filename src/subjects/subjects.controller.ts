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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createSubjectDto: CreateSubjectDto) {
    const subject = await this.subjectsService.create(createSubjectDto);
    return {
      status: HttpStatus.OK,
      message: 'Subject created successfully',
      data: subject,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    const subjects = await this.subjectsService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Subjects retrieved successfully',
      data: subjects,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const subject = await this.subjectsService.findOne(id);
    if (!subject) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Subject not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Subject retrieved successfully',
      data: subject,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const updatedSubject = await this.subjectsService.update(
      id,
      updateSubjectDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.subjectsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Subject deleted successfully',
    };
  }
}
