import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3 = new S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_BUCKET_REGION,
  });

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET;
    const acl = process.env.AWS_S3_BUCKET_ACL;

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
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_S3_ACCESS_KEY);
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_S3_SECRET_ACCESS_KEY);
    console.log('AWS_S3_BUCKET_REGION:', process.env.AWS_S3_BUCKET_REGOIN);
    console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
    console.log('AWS_S3_BUCKET_ACL:', process.env.AWS_S3_BUCKET_ACL);

    const fileUrl = await this.uploadFile(file);
    // Here you can add logic to save the file URL to your database if needed
    return fileUrl;
  }
}
