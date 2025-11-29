import { Client } from 'minio';
import { config } from '../config';

export const minioClient = new Client({
    endPoint: config.MINIO_ENDPOINT,
    port: config.MINIO_PORT,
    useSSL: config.MINIO_USE_SSL,
    accessKey: config.MINIO_ACCESS_KEY,
    secretKey: config.MINIO_SECRET_KEY,
});

// Initialize bucket
export async function initializeMinIO() {
    try {
        const bucketExists = await minioClient.bucketExists(config.MINIO_BUCKET);

        if (!bucketExists) {
            await minioClient.makeBucket(config.MINIO_BUCKET, 'us-east-1');
            console.log(`✅ MinIO bucket '${config.MINIO_BUCKET}' created`);
        } else {
            console.log(`✅ MinIO bucket '${config.MINIO_BUCKET}' exists`);
        }
    } catch (error) {
        console.error('MinIO initialization error:', error);
        throw error;
    }
}
