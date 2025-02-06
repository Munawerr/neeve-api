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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiBody({ type: CreateSubjectDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subject created successfully' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subjects' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subjects retrieved successfully' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subject retrieved successfully' })
  @ApiResponse({ status: HttpStatus.EXPECTATION_FAILED, description: 'Subject not found' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subject' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateSubjectDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subject updated successfully' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subject deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.subjectsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Subject deleted successfully',
    };
  }
}
