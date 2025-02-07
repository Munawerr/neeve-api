import {
  Controller,
  Put,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Post,
  UseGuards,
  HttpStatus,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { S3Service } from '../s3/s3.service';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateStudentUserDto } from './dto/create-student-user.dto';
import { UpdateInstituteUserDto } from './dto/update-institute-user.dto';
import { UpdateStudentUserDto } from './dto/update-student-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CoursesService } from 'src/courses/courses.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    private readonly CoursesService: CoursesService,
  ) {}

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update profile',
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      const updatedProfile = await this.usersService.updateProfile(
        id,
        updateProfileDto,
      );
      return {
        status: HttpStatus.OK,
        message: 'Profile updated successfully',
        data: updatedProfile,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to update profile',
        error: error.message,
      };
    }
  }

  @Put(':id/profile/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile image updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to upload profile image',
  })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const imageUrl = await this.s3Service.uploadFile(file);
      const updatedImage = await this.usersService.updateImageUrl(id, imageUrl);
      return {
        status: HttpStatus.OK,
        message: 'Profile image updated successfully',
        data: updatedImage,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to upload profile image',
        error: error.message,
      };
    }
  }

  @Put(':id/profile/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile cover' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile cover updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to upload profile cover',
  })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const coverUrl = await this.s3Service.uploadFile(file);
      const updatedCover = await this.usersService.updateCoverUrl(id, coverUrl);
      return {
        status: HttpStatus.OK,
        message: 'Profile cover updated successfully',
        data: updatedCover,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to upload profile cover',
        error: error.message,
      };
    }
  }

  @Post('institute')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create institute user' })
  @ApiBody({ type: CreateInstituteUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute user created successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create institute user',
  })
  async createInstituteUser(
    @Body() createInstituteUserDto: CreateInstituteUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const newUser = await this.usersService.createInstituteUser(
        createInstituteUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Institute user created successfully',
        data: newUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create institute user',
        error: error.message,
      };
    }
  }

  @Put('institute/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update institute user' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateInstituteUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute user updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update institute user',
  })
  async updateInstituteUser(
    @Param('id') id: string,
    @Body() UpdateInstituteUserDto: UpdateInstituteUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updatedUser = await this.usersService.updateInstituteUser(
        id,
        UpdateInstituteUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Institute user updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to update institute user',
        error: error.message,
      };
    }
  }

  @Get('institute/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get institute user by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute user retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve institute user',
  })
  async getInstituteUser(@Param('id') id: string) {
    try {
      const user = await this.usersService.getInstituteUser(id);
      return {
        status: HttpStatus.OK,
        message: 'Institute user retrieved successfully',
        data: user,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve institute user',
        error: error.message,
      };
    }
  }

  @Get('institute/:id/data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all courses for an institute' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            courses: { type: 'array', items: { type: 'object' } },
            packages: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve courses for institute',
  })
  async getAllCoursesForInstitute(@Param('id') id: string) {
    try {
      const instituteUser = await this.usersService.getInstituteUser(id, true);

      if (!instituteUser) {
        return {
          status: HttpStatus.EXPECTATION_FAILED,
          message: 'Expectation failed! unable to retrieve data',
        };
      }
      const courseIds = instituteUser.packages.map((pkg) =>
        pkg.course.toString(),
      );

      const courses = await this.CoursesService.findByIds(courseIds);

      return {
        status: HttpStatus.OK,
        message: 'Data retrieved successfully',
        data: {
          courses,
          packages: instituteUser.packages,
        },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve courses for institute',
        error: error.message,
      };
    }
  }

  @Get('institutes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all institute users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve institute users',
  })
  async getAllInstituteUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const { users, total } = await this.usersService.getAllInstituteUsers(
        page,
        limit,
        search,
      );
      return {
        status: HttpStatus.OK,
        message: 'Institute users retrieved successfully',
        data: { users, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve institute users',
        error: error.message,
      };
    }
  }

  @Delete('institute/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete institute user' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute user deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to delete institute user',
  })
  async deleteInstituteUser(@Param('id') id: string) {
    try {
      const deletedUser = await this.usersService.deleteInstituteUser(id);
      return {
        status: HttpStatus.OK,
        message: 'Institute user deleted successfully',
        data: deletedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete institute user',
        error: error.message,
      };
    }
  }

  @Post('student')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create student user' })
  @ApiBody({ type: CreateStudentUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student user created successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create student user',
  })
  async createStudentUser(
    @Body() createStudentUserDto: CreateStudentUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const newUser = await this.usersService.createStudentUser(
        createStudentUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Student user created successfully',
        data: newUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create student user',
        error: error.message,
      };
    }
  }

  @Put('student/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student user' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateStudentUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student user updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update student user',
  })
  async updateStudentUser(
    @Param('id') id: string,
    @Body() UpdateStudentUserDto: UpdateStudentUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updatedUser = await this.usersService.updateStudentUser(
        id,
        UpdateStudentUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Student user updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to update student user',
        error: error.message,
      };
    }
  }

  @Get('student/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student user by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student user retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve student user',
  })
  async getStudentUser(@Param('id') id: string) {
    try {
      const user = await this.usersService.getStudentUser(id);
      return {
        status: HttpStatus.OK,
        message: 'Student user retrieved successfully',
        data: user,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve student user',
        error: error.message,
      };
    }
  }

  @Get('students')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all student users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'institute', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve student users',
  })
  async getAllStudentUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('institute') institute?: string,
  ) {
    try {
      const { users, total } = await this.usersService.getAllStudentUsers(
        page,
        limit,
        search,
        institute,
      );
      return {
        status: HttpStatus.OK,
        message: 'Student users retrieved successfully',
        data: { users, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve student users',
        error: error.message,
      };
    }
  }

  @Delete('student/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete student user' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student user deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to delete student user',
  })
  async deleteStudentUser(@Param('id') id: string) {
    try {
      const deletedUser = await this.usersService.deleteStudentUser(id);
      return {
        status: HttpStatus.OK,
        message: 'Student user deleted successfully',
        data: deletedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete student user',
        error: error.message,
      };
    }
  }
}
