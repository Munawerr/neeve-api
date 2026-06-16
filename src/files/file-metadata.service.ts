import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './schemas/file.schema';
import {
  isGoogleDriveUrl,
  extractGoogleDriveFileId,
  fetchGoogleDriveFileMetadata,
} from '../common/utils/drive.utils';

@Injectable()
export class FileMetadataService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
  ) {}

  async enrichFileName(url: string): Promise<string> {
    if (isGoogleDriveUrl(url)) {
      const fileId = extractGoogleDriveFileId(url);
      if (fileId) {
        const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
        if (apiKey) {
          const metadata = await fetchGoogleDriveFileMetadata(fileId, apiKey);
          if (metadata?.name) return metadata.name;
        }
      }
    }
    return url.split('/').pop() || url;
  }

  async enrichThumbnailUrl(url: string): Promise<string | null> {
    if (isGoogleDriveUrl(url)) {
      const fileId = extractGoogleDriveFileId(url);
      if (fileId) {
        const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
        if (apiKey) {
          const metadata = await fetchGoogleDriveFileMetadata(fileId, apiKey);
          if (metadata?.thumbnailLink) return metadata.thumbnailLink;
        }
      }
    }
    return null;
  }
}
