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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
  async remove(@Param('id') id: string) {
    await this.classesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Class deleted successfully',
    };
  }
}
