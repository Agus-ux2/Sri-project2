import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

class StorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.S3_BUCKET_NAME || 'sri-docs-v2';
        this.s3Client = new S3Client({
            region: 'us-east-1', // Default for MinIO
            endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true, // Required for MinIO
        });

        // Ensure bucket exists on startup (async)
        this.ensureBucketExists().catch(err => {
            console.error('Failed to ensure bucket exists:', err.message);
        });
    }

    /**
     * Ensure the target bucket exists
     */
    private async ensureBucketExists() {
        console.log('S3 Config:', {
            endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
            region: 'us-east-1',
            bucket: this.bucketName
        });

        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
            console.log(`Bucket ${this.bucketName} exists. Verifying access...`);
            await this.s3Client.send(new ListObjectsV2Command({ Bucket: this.bucketName, MaxKeys: 1 }));
            console.log(`Access verified for ${this.bucketName}.`);

            // TEST UPLOAD
            console.log('Attempting startup upload test...');
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: 'startup-test.txt',
                Body: 'Test content'
            }));
            console.log('Startup upload test PASSED.');

        } catch (error: any) {
            console.log('HeadBucket error:', error.message);
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                console.log(`Bucket ${this.bucketName} not found, creating...`);
                try {
                    await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
                    console.log(`Bucket ${this.bucketName} created successfully.`);
                } catch (createError: any) {
                    console.error('CreateBucket error:', createError.message);
                    throw createError;
                }
            } else {
                // Check what buckets exist
                try {
                    const list = await this.s3Client.send(new ListBucketsCommand({}));
                    console.log('Available buckets:', list.Buckets?.map(b => b.Name));
                } catch (listError) {
                    console.error('Failed to list buckets:', listError);
                }
                throw error;
            }
        }
    }

    /**
     * Upload a file to MinIO
     */
    async uploadFile(key: string, body: Buffer, mimeType: string) {
        console.log(`Uploading to bucket: ${this.bucketName} with key: ${key}`);
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: body,
            ContentType: mimeType,
        });

        await this.s3Client.send(command);
        return key;
    }

    /**
     * Generate a signed URL for viewing/downloading a file
     */
    async getSignedUrl(key: string, expiresIn: number = 3600) {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }
}

export default new StorageService();
