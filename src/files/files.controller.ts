import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dtos/create-file.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../s3/s3.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { File } from './schemas/file.schema'; // Import File schema

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('/user/:userId/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        message: { type: 'string' },
        file: { type: 'object' }, // Return file object
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to upload document',
  })
  async uploadDocument(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ status: number; message: string; file?: File }> {
    if (!file) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'File is required',
      };
    }
    try {
      const fileUrl = await this.s3Service.uploadAndSaveDocument(file);
      const createFileDto: CreateFileDto = {
        user: userId, // Set the user ID from the URL
        fileName: file.originalname,
        fileType: file.mimetype,
        fileUrl,
      };
      const savedFile = await this.filesService.create(createFileDto);
      return {
        status: HttpStatus.OK,
        message: 'Document uploaded successfully',
        file: savedFile,
      };
    } catch (error) {
      console.log('error', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to upload document',
      };
    }
  }

  // Add more routes as needed
}
