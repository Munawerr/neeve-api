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
  Res,
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
import { PackagesService } from 'src/packages/packages.service';
import { Workbook } from 'exceljs';
import { Response, Express } from 'express';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    private readonly PackagesService: PackagesService,
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
      await this.usersService.updateImageUrl(id, imageUrl);
      return {
        status: HttpStatus.OK,
        message: 'Profile image updated successfully',
        data: imageUrl,
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
      await this.usersService.updateCoverUrl(id, coverUrl);
      return {
        status: HttpStatus.OK,
        message: 'Profile cover updated successfully',
        data: coverUrl,
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

  @Get('institute/:instituteId/course/:courseId/packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages for an institute and course' })
  @ApiParam({ name: 'instituteId', required: true })
  @ApiParam({ name: 'courseId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Packages retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve packages',
  })
  async getPackagesForInstitute(
    @Param('instituteId') instituteId: string,
    @Param('courseId') courseId: string,
  ) {
    try {
      const instituteUser = await this.usersService.getInstituteUser(
        instituteId,
        true,
      );

      if (instituteUser && instituteUser.toObject().role?.slug == 'student') {
        return {
          status: HttpStatus.OK,
          message: 'Packages retrieved successfully',
          data: instituteUser.packages,
        };
      }

      if (instituteUser) {
        const _packages = instituteUser.packages.filter(
          (pkg) => pkg.course.toString() === courseId,
        );

        const packageIds = _packages.map((pkg) => pkg.toObject()._id);

        const packages = await this.PackagesService.findByIds(packageIds, true);

        return {
          status: HttpStatus.OK,
          message: 'Packages retrieved successfully',
          data: packages,
        };
      } else {
        return {
          status: HttpStatus.EXPECTATION_FAILED,
          message: 'Institute user not found',
        };
      }
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve packages',
        error: error.message,
      };
    }
  }

  @Get(':id/packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all packages for a user' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Packages retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve packages',
  })
  async getPackages(@Param('id') id: string) {
    try {
      const user = await this.usersService.findOne(id, true);

      if (user) {
        const packageIds = user.packages.map((pkg) => pkg.toObject()._id);
        const packages = await this.PackagesService.findByIds(packageIds, true);

        return {
          status: HttpStatus.OK,
          message: 'Packages retrieved successfully',
          data: packages,
        };
      } else {
        return {
          status: HttpStatus.EXPECTATION_FAILED,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve packages',
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
        data: { items: users, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve institute users',
        error: error.message,
      };
    }
  }

  @Get('dropdown/institutes')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all institute users for dropdown' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve institute users',
  })
  async getAllInstituteUsersForDropdown() {
    try {
      const users = await this.usersService.getAllInstituteUsersForDropdown();
      return {
        status: HttpStatus.OK,
        message: 'Institute users retrieved successfully',
        data: users,
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
        data: { items: users, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve student users',
        error: error.message,
      };
    }
  }

  @Get('dropdown/students')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all student users for dropdown' })
  @ApiQuery({
    name: 'instituteId',
    required: false,
    description: 'Filter students by institute',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve student users',
  })
  async getAllStudentUsersForDropdown(
    @Query('instituteId') instituteId?: string,
  ) {
    try {
      const students =
        await this.usersService.getAllStudentUsersForDropdown(instituteId);
      return {
        status: HttpStatus.OK,
        message: 'Student users retrieved successfully',
        data: students,
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

  @Post('students/bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create student users from Excel file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Students created successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create students',
  })
  async bulkCreateStudents(@UploadedFile() file: Express.Multer.File) {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.getWorksheet(1);

      const students: any = [];
      if (worksheet) {
        const roleId = await this.usersService.getStudentRoleId();
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            // Skip header row
            const student = {
              full_name: row.getCell(1).value,
              email: row.getCell(2).value,
              phone: row.getCell(3).value,
              city: row.getCell(4).value,
              zip: row.getCell(5).value,
              regNo: row.getCell(6).value,
              role: roleId,
              packages:
                row && row.getCell(7).value
                  ? row.getCell(7).value?.toString().split(',')
                  : [],
            };
            students.push(student);
          }
        });
      }

      const createdStudents =
        await this.usersService.bulkCreateStudents(students);
      return {
        status: HttpStatus.OK,
        message: 'Students created successfully',
        data: createdStudents,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create students',
        error: error.message,
      };
    }
  }

  @Get('students/template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download template for bulk student creation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template downloaded successfully',
  })
  async downloadTemplate(@Res() res: Response) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Full Name', key: 'full_name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Zip', key: 'zip', width: 10 },
      { header: 'Institute RegNo', key: 'regNo', width: 20 },
      { header: 'Packages (comma separated)', key: 'packages', width: 30 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'students_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('institutes/bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create institute users from Excel file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute users created successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create institute users',
  })
  async bulkCreateInstituteUsers(@UploadedFile() file: Express.Multer.File) {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.getWorksheet(1);

      const institutes: any[] = [];
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            // Skip header row
            const institute = {
              full_name: row.getCell(1).value,
              email: row.getCell(2).value,
              phone: row.getCell(3).value,
              city: row.getCell(4).value,
              zip: row.getCell(5).value,
              regNo: row.getCell(6).value,
              packages: row.getCell(7).value
                ? row.getCell(7).value?.toString().split(',')
                : [],
            };
            institutes.push(institute);
          }
        });
      }

      await this.usersService.bulkCreateInstituteUsers(institutes);

      return {
        status: HttpStatus.OK,
        message: 'Institute users created successfully',
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create institute users',
        error: error.message,
      };
    }
  }

  @Get('institutes/template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download template for bulk institute user creation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template downloaded successfully',
  })
  async downloadInstituteTemplate(@Res() res: Response) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Institutes');

    worksheet.columns = [
      { header: 'Full Name', key: 'full_name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Zip', key: 'zip', width: 10 },
      { header: 'Institute RegNo', key: 'regNo', width: 20 },
      { header: 'Packages (comma separated)', key: 'packages', width: 30 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'institutes_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve user',
  })
  async getUser(@Param('id') id: string) {
    try {
      const user = await this.usersService.findOne(id, true);
      if (user) {
        const { password, ...userWithoutPassword } = user.toObject();
        const analytics = await this.usersService.getUserAnalytics(user);
        return {
          status: HttpStatus.OK,
          message: 'User retrieved successfully',
          data: { ...userWithoutPassword, analytics },
        };
      }
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      };
    } catch (error) {
      console.log('error', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve user',
        error: error.message,
      };
    }
  }

  @Get('u/staff')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all staff users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff users retrieved successfully',
  })
  async getAllStaffUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const { users, total } = await this.usersService.getAllStaffUsers(
        page,
        limit,
        search,
      );
      return {
        status: HttpStatus.OK,
        message: 'Staff users retrieved successfully',
        data: { items: users, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve staff users',
        error: error.message,
      };
    }
  }

  @Post('u/staff')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create staff user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff user created successfully',
  })
  async createStaffUser(
    @Body() createStaffUserDto: CreateStaffUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const newUser = await this.usersService.createStaffUser(
        createStaffUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Staff user created successfully',
        data: newUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create staff user',
        error: error.message,
      };
    }
  }

  @Put('u/staff/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update staff user' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff user updated successfully',
  })
  async updateStaffUser(
    @Param('id') id: string,
    @Body() updateStaffUserDto: UpdateStaffUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updatedUser = await this.usersService.updateStaffUser(
        id,
        updateStaffUserDto,
        file,
      );
      return {
        status: HttpStatus.OK,
        message: 'Staff user updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to update staff user',
        error: error.message,
      };
    }
  }

  @Delete('u/staff/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete staff user' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff user deleted successfully',
  })
  async deleteStaffUser(@Param('id') id: string) {
    try {
      const deletedUser = await this.usersService.deleteStaffUser(id);
      return {
        status: HttpStatus.OK,
        message: 'Staff user deleted successfully',
        data: deletedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete staff user',
        error: error.message,
      };
    }
  }

  @Get('c/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  async getAllRoles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const { roles, total } = await this.usersService.getAllRoles(
        page,
        limit,
        search,
      );
      return {
        status: HttpStatus.OK,
        message: 'Roles retrieved successfully',
        data: { items: roles, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve roles',
        error: error.message,
      };
    }
  }

  @Get('c/roles/dropdown')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all roles for dropdown' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  async getRolesForDropdown() {
    try {
      const roles = await this.usersService.getRolesForDropdown();
      return {
        status: HttpStatus.OK,
        message: 'Roles retrieved successfully',
        data: roles,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve roles',
        error: error.message,
      };
    }
  }

  @Get('c/roles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
  })
  async getRole(@Param('id') id: string) {
    try {
      const role = await this.usersService.findRoleById(id);
      return {
        status: HttpStatus.OK,
        message: 'Role retrieved successfully',
        data: role,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve role',
        error: error.message,
      };
    }
  }

  @Post('c/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role created successfully',
  })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    try {
      const newRole = await this.usersService.createRole(createRoleDto);
      return {
        status: HttpStatus.OK,
        message: 'Role created successfully',
        data: newRole,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create role',
        error: error.message,
      };
    }
  }

  @Put('c/roles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    try {
      const updatedRole = await this.usersService.updateRole(id, updateRoleDto);
      return {
        status: HttpStatus.OK,
        message: 'Role updated successfully',
        data: updatedRole,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to update role',
        error: error.message,
      };
    }
  }

  @Delete('c/roles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  async deleteRole(@Param('id') id: string) {
    try {
      const deletedRole = await this.usersService.deleteRole(id);
      return {
        status: HttpStatus.OK,
        message: 'Role deleted successfully',
        data: deletedRole,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete role',
        error: error.message,
      };
    }
  }
}
