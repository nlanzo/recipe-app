import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * Uploads a file to S3
 * @param fileBuffer - The file buffer to upload
 * @param key - The S3 key (path) where the file will be stored
 * @returns The URL of the uploaded file
 */
export async function uploadFile(
  fileBuffer: Buffer,
  key: string
): Promise<string> {
  try {
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
    })

    await s3Client.send(uploadCommand)
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
  } catch (error) {
    if (error instanceof S3ServiceException) {
      console.error(`S3 upload error: ${error.name} - ${error.message}`)
    }
    throw new Error("Failed to upload file to S3")
  }
}

/**
 * Deletes a file from S3
 * @param key - The S3 key of the file to delete
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    })
    await s3Client.send(deleteCommand)
  } catch (error) {
    if (error instanceof S3ServiceException) {
      console.error(`S3 delete error: ${error.name} - ${error.message}`)
    }
    throw new Error("Failed to delete file from S3")
  }
}

/**
 * Deletes multiple files from S3
 * @param keys - Array of S3 keys to delete
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return

  try {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    })
    await s3Client.send(deleteCommand)
  } catch (error) {
    if (error instanceof S3ServiceException) {
      console.error(`S3 batch delete error: ${error.name} - ${error.message}`)
    }
    throw new Error("Failed to delete files from S3")
  }
}
