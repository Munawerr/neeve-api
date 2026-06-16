import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileMetadataService } from './file-metadata.service';
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
import { File } from './schemas/file.schema';
import {
  isGoogleDriveUrl,
  extractGoogleDriveFileId,
  fetchGoogleDriveFileMetadata,
} from '../common/utils/drive.utils';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly fileMetadataService: FileMetadataService,
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

  @Get('/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all files for a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'object' }, // Return array of file objects
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve files',
  })
  async getUserFiles(
    @Param('userId') userId: string,
  ): Promise<{ status: number; message: string; files?: File[] }> {
    try {
      const files = await this.filesService.findByUserId(userId);
      return {
        status: HttpStatus.OK,
        message: 'Files retrieved successfully',
        files,
      };
    } catch (error) {
      console.log('error', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve files',
      };
    }
  }

  @Post('enrich-metadata')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'One-time migration: enrich existing file records with Drive metadata',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Enrichment job started',
  })
  async startEnrichMetadata() {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'GOOGLE_DRIVE_API_KEY is not configured',
      };
    }

    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.enrichJobs.set(jobId, {
      total: 0,
      updated: 0,
      failed: 0,
      status: 'pending' as const,
    });

    this.processEnrichJob(jobId).catch(() => {});

    return {
      status: HttpStatus.ACCEPTED,
      message: 'Enrichment job started',
      data: { jobId },
    };
  }

  @Get('enrich-metadata/:jobId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enrichment job status' })
  async getEnrichJobStatus(@Param('jobId') jobId: string) {
    const job = this.enrichJobs.get(jobId);
    if (!job) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Job not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Job status retrieved',
      data: { ...job },
    };
  }

  private enrichJobs = new Map<string, {
    total: number;
    updated: number;
    failed: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
  }>();

  private async processEnrichJob(jobId: string) {
    const job = this.enrichJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY!;

    try {
      const allFiles = await this.filesService.findAll();
      const driveFiles = allFiles.filter((f) => isGoogleDriveUrl(f.fileUrl));
      job.total = driveFiles.length;

      for (const file of driveFiles) {
        try {
          const fileId = extractGoogleDriveFileId(file.fileUrl);
          if (!fileId) { job.failed++; continue; }

          const metadata = await fetchGoogleDriveFileMetadata(fileId, apiKey);
          if (!metadata) { job.failed++; continue; }

          const updates: Record<string, string> = {};
          if (metadata.name && file.fileName !== metadata.name) {
            updates.fileName = metadata.name;
          }
          if (metadata.thumbnailLink) {
            updates.thumbnailUrl = metadata.thumbnailLink;
          }

          if (Object.keys(updates).length > 0) {
            await this.filesService.update(String(file._id), updates);
            job.updated++;
          }
        } catch {
          job.failed++;
        }
      }

      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
    }
  }


