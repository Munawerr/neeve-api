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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@ApiTags('chapters')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiBody({ type: CreateChapterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chapter created successfully',
  })
  async create(@Body() createChapterDto: CreateChapterDto) {
    const chapter = await this.chaptersService.create(createChapterDto);
    return {
      status: HttpStatus.OK,
      message: 'Chapter created successfully',
      data: chapter,
    };
  }

  @Get('subject/:subjectId/institute/:instituteId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chapters' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiParam({ name: 'instituteId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chapters retrieved successfully',
  })
  async findAll(
    @Param('subjectId') subjectId: string,
    @Param('instituteId') instituteId: string,
  ) {
    const chapters = await this.chaptersService.findAllBySubjectAndInstitute(
      subjectId,
      instituteId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Chapters retrieved successfully',
      data: chapters,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a chapter by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chapter retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Chapter not found',
  })
  async findOne(@Param('id') id: string) {
    const chapter = await this.chaptersService.findOne(id);
    if (!chapter) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Chapter not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Chapter retrieved successfully',
      data: chapter,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a chapter' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateChapterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chapter updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateChapterDto: UpdateChapterDto,
  ) {
    const updatedChapter = await this.chaptersService.update(
      id,
      updateChapterDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Chapter updated successfully',
      data: updatedChapter,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a chapter' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chapter deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.chaptersService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Chapter deleted successfully',
    };
  }
}
