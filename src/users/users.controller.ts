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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedProfile = await this.usersService.updateProfile(
      id,
      updateProfileDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: updatedProfile,
    };
  }

  @Put(':id/profile/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = await this.s3Service.uploadFile(file);
    const updatedImage = await this.usersService.updateImageUrl(id, imageUrl);
    return {
      status: HttpStatus.OK,
      message: 'Profile image updated successfully',
      data: updatedImage,
    };
  }

  @Put(':id/profile/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const coverUrl = await this.s3Service.uploadFile(file);
    const updatedCover = await this.usersService.updateCoverUrl(id, coverUrl);
    return {
      status: HttpStatus.OK,
      message: 'Profile cover updated successfully',
      data: updatedCover,
    };
  }

  @Post('institute')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createInstituteUser(
    @Body() createInstituteUserDto: CreateInstituteUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const newUser = await this.usersService.createInstituteUser(
      createInstituteUserDto,
      file,
    );
    return {
      status: HttpStatus.OK,
      message: 'Institute user created successfully',
      data: newUser,
    };
  }

  @Put('institute/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateInstituteUser(
    @Param('id') id: string,
    @Body() UpdateInstituteUserDto: UpdateInstituteUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
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
  }

  @Get('institute/:id')
  @UseGuards(JwtAuthGuard)
  async getInstituteUser(@Param('id') id: string) {
    const user = await this.usersService.getInstituteUser(id);
    return {
      status: HttpStatus.OK,
      message: 'Institute user retrieved successfully',
      data: user,
    };
  }

  @Get('institutes')
  @UseGuards(JwtAuthGuard)
  async getAllInstituteUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
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
  }

  @Delete('institute/:id')
  @UseGuards(JwtAuthGuard)
  async deleteInstituteUser(@Param('id') id: string) {
    const deletedUser = await this.usersService.deleteInstituteUser(id);
    return {
      status: HttpStatus.OK,
      message: 'Institute user deleted successfully',
      data: deletedUser,
    };
  }

  @Post('student')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createStudentUser(
    @Body() createStudentUserDto: CreateStudentUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const newUser = await this.usersService.createStudentUser(
      createStudentUserDto,
      file,
    );
    return {
      status: HttpStatus.OK,
      message: 'Student user created successfully',
      data: newUser,
    };
  }

  @Put('student/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateStudentUser(
    @Param('id') id: string,
    @Body() UpdateStudentUserDto: UpdateStudentUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
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
  }

  @Get('student/:id')
  @UseGuards(JwtAuthGuard)
  async getStudentUser(@Param('id') id: string) {
    const user = await this.usersService.getStudentUser(id);
    return {
      status: HttpStatus.OK,
      message: 'Student user retrieved successfully',
      data: user,
    };
  }

  @Get('students')
  @UseGuards(JwtAuthGuard)
  async getAllStudentUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('institute') institute?: string,
  ) {
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
  }

  @Delete('student/:id')
  @UseGuards(JwtAuthGuard)
  async deleteStudentUser(@Param('id') id: string) {
    const deletedUser = await this.usersService.deleteStudentUser(id);
    return {
      status: HttpStatus.OK,
      message: 'Student user deleted successfully',
      data: deletedUser,
    };
  }
}
