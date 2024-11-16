// server.ts
import express, { Request, Response } from "express"
import multer from "multer"
import AWS from "aws-sdk"

// Initialize Express app
const app = express()
const port = 3000

// Initialize AWS S3
AWS.config.update({
  region: "us-east-2", // Your AWS region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!, // Use environment variables for security
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})

const s3 = new AWS.S3()

// Configure Multer to handle file uploads
const storage = multer.memoryStorage() // Store uploaded files in memory
const upload = multer({ storage: storage })

// Define types for the image upload
interface FileRequest extends Request {
  file?: Express.Multer.File
}

// Function to upload image to S3
const uploadImageToS3 = async (file: Express.Multer.File): Promise<string> => {
  const params: AWS.S3.PutObjectRequest = {
    Bucket: process.env.AWS_BUCKET_NAME!, // Your bucket name
    Key: `images/${Date.now()}-${file.originalname}`, // Unique file name
    Body: file.buffer, // The binary data of the file
    ContentType: file.mimetype, // MIME type of the file
    ACL: "public-read", // Make the file publicly readable
  }

  try {
    const uploadResult = await s3.upload(params).promise()
    return uploadResult.Location // Return the URL of the uploaded file
  } catch (error) {
    console.error("Error uploading image to S3:", error)
    throw new Error("Failed to upload image to S3")
  }
}

// POST endpoint to handle image upload
app.post(
  "/upload",
  upload.single("image"),
  async (req: FileRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).send("No file uploaded.")
        return
      }

      // Upload the image to S3
      const imageUrl = await uploadImageToS3(req.file)

      // Send back the uploaded image URL
      res.status(200).json({ imageUrl })
    } catch (error) {
      res.status(500).send("Failed to upload image")
    }
  }
)

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
