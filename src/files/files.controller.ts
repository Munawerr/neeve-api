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

interface EnrichJob {
  total: number;
  updated: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

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
      console.log('[enrich] startEnrichMetadata called but GOOGLE_DRIVE_API_KEY is not configured');
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'GOOGLE_DRIVE_API_KEY is not configured',
      };
    }

    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    console.log(`[enrich] Starting enrichment job ${jobId}`);
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
    console.log(`[enrich] Status check for job ${jobId}`);
    const job = this.enrichJobs.get(jobId);
    if (!job) {
      console.log(`[enrich] Job ${jobId} not found`);
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

  private enrichJobs = new Map<string, EnrichJob>();

  private async processEnrichJob(jobId: string) {
    const job = this.enrichJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY!;

    try {
      const allFiles = await this.filesService.findAll();
      console.log(`[enrich:${jobId}] Found ${allFiles.length} total files`);

      const driveFiles = allFiles.filter((f) => isGoogleDriveUrl(f.fileUrl));
      job.total = driveFiles.length;
      console.log(`[enrich:${jobId}] Filtered to ${driveFiles.length} Google Drive files`);
      console.log(`[enrich:${jobId}] GOOGLE_DRIVE_API_KEY present: ${!!apiKey}`);

      for (const file of driveFiles) {
        const fileId = extractGoogleDriveFileId(file.fileUrl);
        console.log(`[enrich:${jobId}] Processing file _id=${file._id} fileId=${fileId} currentName="${file.fileName}" url=${file.fileUrl.substring(0, 80)}`);

        if (!fileId) {
          console.log(`[enrich:${jobId}] Could not extract fileId from URL, skipping`);
          job.failed++;
          continue;
        }

        let metadata: { name?: string; thumbnailLink?: string } | null = null;
        try {
          metadata = await fetchGoogleDriveFileMetadata(fileId, apiKey);
        } catch (err) {
          console.log(`[enrich:${jobId}] fetchGoogleDriveFileMetadata threw for fileId=${fileId}: ${err}`);
        }

        if (!metadata) {
          console.log(`[enrich:${jobId}] No metadata returned from Drive API for fileId=${fileId}`);
          job.failed++;
          continue;
        }

        console.log(`[enrich:${jobId}] Drive API returned name="${metadata.name}" thumbnailLink="${metadata.thumbnailLink}"`);

        const updates: Record<string, string> = {};
        if (metadata.name && file.fileName !== metadata.name) {
          updates.fileName = metadata.name;
          console.log(`[enrich:${jobId}] Will update fileName: "${file.fileName}" -> "${metadata.name}"`);
        } else {
          console.log(`[enrich:${jobId}] fileName unchanged (current="${file.fileName}" drive="${metadata.name}")`);
        }

        if (metadata.thumbnailLink) {
          updates.thumbnailUrl = metadata.thumbnailLink;
          console.log(`[enrich:${jobId}] Will update thumbnailUrl: "${metadata.thumbnailLink}"`);
        } else {
          console.log(`[enrich:${jobId}] No thumbnailLink returned from Drive API`);
        }

        if (Object.keys(updates).length > 0) {
          try {
            await this.filesService.update(String(file._id), updates);
            job.updated++;
            console.log(`[enrich:${jobId}] Successfully updated file ${file._id}`);
          } catch (err) {
            console.log(`[enrich:${jobId}] Update failed for file ${file._id}: ${err}`);
            job.failed++;
          }
        } else {
          console.log(`[enrich:${jobId}] No updates needed for file ${file._id}`);
        }
      }

      console.log(`[enrich:${jobId}] Job complete: ${job.updated}/${job.total} updated, ${job.failed} failed`);
      job.status = 'completed';
    } catch (error) {
      console.log(`[enrich:${jobId}] Fatal error: ${error}`);
      job.status = 'failed';
      job.error = String(error);
    }
  }


}
