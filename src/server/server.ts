// server.ts
import express, { Request, Response } from "express"
import cors from "cors"
import multer from "multer"
import AWS from "aws-sdk"
import { Upload } from "@aws-sdk/lib-storage"
import { PutObjectCommandInput, S3 } from "@aws-sdk/client-s3"
import { getRecipeById, getRecipeCardData } from "../db/recipeQueries"

// Initialize Express app
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())

// Initialize AWS S3
// JS SDK v3 does not support global configuration.
// Codemod has attempted to pass values to each service client in this file.
// You may need to update clients outside of this file, if they use global config.
AWS.config.update({
  region: "us-east-2", // Your AWS region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!, // Use environment variables for security
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})

const s3 = new S3({
  // Your AWS region
  region: "us-east-2",

  credentials: {
    // Use environment variables for security
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,

    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Configure Multer to handle file uploads
const storage = multer.memoryStorage() // Store uploaded files in memory
const upload = multer({ storage: storage })

// Define types for the image upload
interface FileRequest extends Request {
  file?: Express.Multer.File
}

// Function to upload image to S3
const uploadImageToS3 = async (file: Express.Multer.File): Promise<string> => {
  const params: PutObjectCommandInput = {
    Bucket: process.env.AWS_BUCKET_NAME!, // Your bucket name
    Key: `images/${Date.now()}-${file.originalname}`, // Unique file name
    Body: file.buffer, // The binary data of the file
    ContentType: file.mimetype, // MIME type of the file
    ACL: "public-read", // Make the file publicly readable
  }

  try {
    const uploadResult = await new Upload({
      client: s3,
      params,
    }).done()
    if (!uploadResult.Location) {
      throw new Error("Failed to get the uploaded file location")
    }
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
      console.error("Failed to upload image:", error)
    }
  }
)

// Query the database for the recipe with the specified ID
app.get("/api/recipes/:id", async (req: Request, res: Response) => {
  const recipeId = parseInt(req.params.id)
  const recipe = await getRecipeById(recipeId)
  res.json(recipe)
})

app.get("/api/recipes", async (_req: Request, res: Response) => {
  const recipes = await getRecipeCardData()
  res.json(recipes)
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
