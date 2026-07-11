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
    summary:
      'One-time migration: enrich existing file records with Drive metadata',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File metadata enrichment completed',
  })
  async enrichExistingFileMetadata() {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      console.log('[enrich] GOOGLE_DRIVE_API_KEY not configured');
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'GOOGLE_DRIVE_API_KEY is not configured',
      };
    }

    console.log('[enrich] Starting enrichment synchronously');

    const allFiles = await this.filesService.findAll();
    console.log(`[enrich] Found ${allFiles.length} total files`);

    const driveFiles = allFiles.filter((f) => isGoogleDriveUrl(f.fileUrl));
    const pendingFiles = driveFiles.filter((f) => !f.thumbnailUrl);
    const skipped = driveFiles.length - pendingFiles.length;
    console.log(
      `[enrich] Filtered to ${driveFiles.length} Google Drive files, ${skipped} already enriched, ${pendingFiles.length} pending`,
    );

    let updated = 0;
    let failed = 0;

    for (const file of pendingFiles) {
      const fileId = extractGoogleDriveFileId(file.fileUrl);
      console.log(
        `[enrich] Processing file _id=${String(file._id)} fileId=${String(fileId)} name="${String(file.fileName)}"`,
      );

      if (!fileId) {
        console.log(`[enrich] No fileId extracted, skipping`);
        failed++;
        continue;
      }

      let metadata: { name?: string; thumbnailLink?: string } | null = null;
      try {
        metadata = await fetchGoogleDriveFileMetadata(fileId, apiKey);
      } catch (err) {
        console.log(`[enrich] fetch threw for ${fileId}: ${err}`);
      }

      if (!metadata) {
        console.log(`[enrich] No metadata for ${fileId}`);
        failed++;
        continue;
      }

      console.log(
        `[enrich] Drive returned name="${metadata.name}" thumb="${metadata.thumbnailLink}"`,
      );

      const updates: Record<string, string> = {};
      if (metadata.name && file.fileName !== metadata.name) {
        updates.fileName = metadata.name;
      }
      if (metadata.thumbnailLink) {
        updates.thumbnailUrl = metadata.thumbnailLink;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await this.filesService.update(String(file._id), updates);
          updated++;
          console.log(
            `[enrich] Updated file ${String(file._id)}: ${JSON.stringify(updates)}`,
          );
        } catch (err) {
          console.log(
            `[enrich] Update failed for ${String(file._id)}: ${String(err)}`,
          );
          failed++;
        }
      } else {
        console.log(`[enrich] No updates needed for ${String(file._id)}`);
      }
    }

    console.log(
      `[enrich] Done: ${updated}/${pendingFiles.length} updated, ${failed} failed, ${skipped} skipped`,
    );

    return {
      status: HttpStatus.OK,
      message: 'File metadata enrichment completed',
      data: { total: driveFiles.length, updated, failed, skipped },
    };
  }
}
