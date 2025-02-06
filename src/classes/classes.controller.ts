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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class created successfully' })
  async create(@Body() createClassDto: CreateClassDto) {
    const classEntity = await this.classesService.create(createClassDto);
    return {
      status: HttpStatus.OK,
      message: 'Class created successfully',
      data: classEntity,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all classes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Classes retrieved successfully' })
  async findAll() {
    const classes = await this.classesService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a class by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class retrieved successfully' })
  @ApiResponse({ status: HttpStatus.EXPECTATION_FAILED, description: 'Class not found' })
  async findOne(@Param('id') id: string) {
    const classEntity = await this.classesService.findOne(id);
    if (!classEntity) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Class not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Class retrieved successfully',
      data: classEntity,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a class' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateClassDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    const updatedClass = await this.classesService.update(id, updateClassDto);
    return {
      status: HttpStatus.OK,
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a class' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.classesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Class deleted successfully',
    };
  }
}
