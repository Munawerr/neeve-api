import {
  Controller,
  Put,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { S3Service } from '../s3/s3.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Put(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  @Put(':id/profile/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = await this.s3Service.uploadFile(file);
    return this.usersService.updateImageUrl(id, imageUrl);
  }

  @Put(':id/profile/cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const coverUrl = await this.s3Service.uploadFile(file);
    return this.usersService.updateCoverUrl(id, coverUrl);
  }

  @Put(':id/profile/bio')
  async updateBio(@Param('id') id: string, @Body('bio') bio: string) {
    return this.usersService.updateBio(id, bio);
  }
}
