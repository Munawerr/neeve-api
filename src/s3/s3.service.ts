import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { File } from '../files/schemas/file.schema'; // Import File schema

@Injectable()
export class S3Service {
  private s3: S3;

  constructor() {
    if (process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET) {
      this.s3 = new S3({
        endpoint: process.env.DO_SPACES_ENDPOINT, // DigitalOcean Spaces endpoint
        accessKeyId: process.env.DO_SPACES_KEY, // DigitalOcean Spaces key
        secretAccessKey: process.env.DO_SPACES_SECRET, // DigitalOcean Spaces secret
      });
    } else {
      this.s3 = new S3({
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        region: process.env.AWS_S3_BUCKET_REGION,
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const bucket = process.env.DO_SPACES_KEY
      ? process.env.DO_SPACES_BUCKET
      : process.env.AWS_S3_BUCKET;
    const acl = process.env.DO_SPACES_KEY
      ? process.env.DO_SPACES_ACL
      : process.env.AWS_S3_BUCKET_ACL;

    if (!bucket || !acl) {
      throw new Error(
        'Bucket name or ACL is not defined in environment variables',
      );
    }

    const params = {
      Bucket: bucket,
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
}
