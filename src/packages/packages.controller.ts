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
  SetMetadata,
  Request,
  Headers,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CoursesService } from '../courses/courses.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectsService } from '../subjects/subjects.service';
import * as jwt from 'jsonwebtoken';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from 'src/users/users.service';

@ApiTags('packages')
@Controller('packages')
@UseGuards(JwtAuthGuard)
export class PackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly coursesService: CoursesService,
    private readonly classesService: ClassesService,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new package' })
  @ApiBody({ type: CreatePackageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Package created successfully',
  })
  @SetMetadata('permissions', ['edit_packages'])
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Packages retrieved successfully',
  })
  @SetMetadata('permissions', ['view_packages'])
  async findAll(
    @Headers('authorization') authHeader: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid token',
      };
    }

    if (decodedToken.role === 'institute') {
      const user = await this.usersService.findOne(decodedToken.sub, true);
      return {
        status: HttpStatus.OK,
        message: 'Packages retrieved successfully',
        data: user ? user.packages : [],
      };
    } else if (!['institute', 'student'].includes(decodedToken.role)) {
      const { packages, total } = await this.packagesService.findAll(
        page,
        limit,
        search,
      );
      return {
        status: HttpStatus.OK,
        message: 'Packages retrieved successfully',
        data: { items: packages, total },
      };
    } else {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Access denied',
      };
    }
  }

  @Get('dropdown')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages for dropdown' })
  @ApiQuery({
    name: 'instituteId',
    required: false,
    description: 'Filter packages by institute',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Packages retrieved successfully for dropdown',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve packages for dropdown',
  })
  @SetMetadata('permissions', ['view_packages'])
  async getAllPackagesForDropdown(@Query('instituteId') instituteId?: string) {
    try {
      const packages =
        await this.packagesService.getAllPackagesForDropdown(instituteId);
      return {
        status: HttpStatus.OK,
        message: 'Packages retrieved successfully for dropdown',
        data: packages,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve packages for dropdown',
        error: error.message,
      };
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a package by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Package retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Package not found',
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a package' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdatePackageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Package updated successfully',
  })
  @SetMetadata('permissions', ['edit_packages'])
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a package' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Package deleted successfully',
  })
  @SetMetadata('permissions', ['delete_packages'])
  async remove(@Param('id') id: string) {
    await this.packagesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Package deleted successfully',
    };
  }
}
