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
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CoursesService } from '../courses/courses.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectsService } from '../subjects/subjects.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('packages')
@Controller('packages')
export class PackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly coursesService: CoursesService,
    private readonly classesService: ClassesService,
    private readonly subjectsService: SubjectsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new package' })
  @ApiBody({ type: CreatePackageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Package created successfully' })
  async create(@Body() createPackageDto: CreatePackageDto) {
    const { course, class: classId, subjects, ...rest } = createPackageDto;
    const courseEntity = await this.coursesService.findOne(course);
    const classEntity = await this.classesService.findOne(classId);
    const subjectEntities = await this.subjectsService.findByIds(subjects);

    if (!courseEntity || !classEntity || !subjectEntities) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Course, class, and subjects not found',
      };
    }

    const code = `${courseEntity.code}/${classEntity.code}/${subjectEntities.map((s) => s.code).join('')}${'X'.repeat(6 - subjectEntities.length)}`;
    const description = `${courseEntity.title} ${classEntity.title} - ${subjectEntities.map((s) => s.title).join(', ')}`;

    const packageEntity = await this.packagesService.create({
      course,
      class: classId,
      subjects,
      code,
      description,
    });

    return {
      status: HttpStatus.OK,
      message: 'Package created successfully',
      data: packageEntity,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Packages retrieved successfully' })
  async findAll() {
    const packages = await this.packagesService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Packages retrieved successfully',
      data: packages,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a package by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Package retrieved successfully' })
  @ApiResponse({ status: HttpStatus.EXPECTATION_FAILED, description: 'Package not found' })
  async findOne(@Param('id') id: string) {
    const packageEntity = await this.packagesService.findOne(id);
    if (!packageEntity) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Package not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Package retrieved successfully',
      data: packageEntity,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a package' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdatePackageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Package updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updatePackageDto: UpdatePackageDto,
  ) {
    const { course, class: classId, subjects, ...rest } = updatePackageDto;
    const courseEntity = await this.coursesService.findOne(course);
    const classEntity = await this.classesService.findOne(classId);
    const subjectEntities = await this.subjectsService.findByIds(subjects);

    if (!courseEntity || !classEntity || !subjectEntities) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Course, class, and subjects not found',
      };
    }
    const code = `${courseEntity.code}/${classEntity.code}/${subjectEntities.map((s) => s.code).join('')}${'X'.repeat(6 - subjectEntities.length)}`;
    const description = `${courseEntity.title} ${classEntity.title} - ${subjectEntities.map((s) => s.title).join(', ')}`;

    const updatedPackage = await this.packagesService.update(id, {
      course,
      class: classId,
      subjects,
      code,
      description,
    });

    return {
      status: HttpStatus.OK,
      message: 'Package updated successfully',
      data: updatedPackage,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a package' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Package deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.packagesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Package deleted successfully',
    };
  }
}
