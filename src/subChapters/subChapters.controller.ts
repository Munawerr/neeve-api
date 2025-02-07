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
import { SubChaptersService } from './subChapters.service';
import { CreateSubChapterDto } from './dto/create-subChapter.dto';
import { UpdateSubChapterDto } from './dto/update-subChapter.dto';

@ApiTags('subChapters')
@Controller('subChapters')
export class SubChaptersController {
  constructor(private readonly subChaptersService: SubChaptersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subChapter' })
  @ApiBody({ type: CreateSubChapterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubChapter created successfully',
  })
  async create(@Body() createSubChapterDto: CreateSubChapterDto) {
    const subChapter =
      await this.subChaptersService.create(createSubChapterDto);
    return {
      status: HttpStatus.OK,
      message: 'SubChapter created successfully',
      data: subChapter,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subChapters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubChapters retrieved successfully',
  })
  async findAll() {
    const subChapters = await this.subChaptersService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'SubChapters retrieved successfully',
      data: subChapters,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subChapter by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubChapter retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'SubChapter not found',
  })
  async findOne(@Param('id') id: string) {
    const subChapter = await this.subChaptersService.findOne(id);
    if (!subChapter) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'SubChapter not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'SubChapter retrieved successfully',
      data: subChapter,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subChapter' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateSubChapterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubChapter updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSubChapterDto: UpdateSubChapterDto,
  ) {
    const updatedSubChapter = await this.subChaptersService.update(
      id,
      updateSubChapterDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'SubChapter updated successfully',
      data: updatedSubChapter,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subChapter' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubChapter deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.subChaptersService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'SubChapter deleted successfully',
    };
  }
}
