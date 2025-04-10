import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Service {
  private s3: S3;
  private readonly bucketName: string;

  constructor() {
    if (process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET) {
      this.s3 = new S3({
        endpoint: process.env.DO_SPACES_ENDPOINT, // DigitalOcean Spaces endpoint
        accessKeyId: process.env.DO_SPACES_KEY, // DigitalOcean Spaces key
        secretAccessKey: process.env.DO_SPACES_SECRET, // DigitalOcean Spaces secret
      });
      this.bucketName = process.env.DO_SPACES_BUCKET || '';
    } else {
      this.s3 = new S3({
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        region: process.env.AWS_S3_BUCKET_REGION,
      });
      this.bucketName = process.env.AWS_S3_BUCKET || '';
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const acl = process.env.DO_SPACES_KEY
      ? process.env.DO_SPACES_ACL
      : process.env.AWS_S3_BUCKET_ACL;

    if (!this.bucketName || !acl) {
      throw new Error(
        'Bucket name or ACL is not defined in environment variables',
      );
    }

    const params = {
      Bucket: this.bucketName,
      Key: `${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ACL: acl,
    };

    const data = await this.s3.upload(params).promise();
    return data.Location;
  }

  async uploadAndSaveDocument(file: Express.Multer.File): Promise<string> {
    const fileUrl = await this.uploadFile(file);
    return fileUrl;
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType?: string,
  ): Promise<string> {
    const key = `reports/${uuidv4()}-${fileName}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType || this.getContentType(fileName),
      ACL: 'public-read',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    await this.s3.deleteObject(params).promise();
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();

    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.xls':
        return 'application/vnd.ms-excel';
      case '.csv':
        return 'text/csv';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.json':
        return 'application/json';
      case '.txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
}
