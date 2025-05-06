import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import * as schema from "./schema.js"

const { Pool } = pg

// Load environment variables based on NODE_ENV
const getEnvFile = () => {
  switch (process.env.NODE_ENV) {
    case "production":
      return ".env"
    case "test":
      return ".env.test"
    default:
      return ".env.development"
  }
}

const envFile = getEnvFile()
dotenv.config({ path: envFile })

// Get the database URL from the appropriate environment file
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Configure SSL for production
const isProduction = process.env.NODE_ENV === "production"
const serverRoot = path.resolve(
  process.cwd(),
  isProduction ? "dist" : "src/server"
)
const caCertPath = path.join(serverRoot, "certs", "us-east-2-bundle.pem")

console.log("Current working directory:", process.cwd())
console.log("Server root directory:", serverRoot)
console.log("Database URL:", databaseUrl.replace(/:[^:]*@/, ":****@"))
console.log("SSL Certificate Path:", caCertPath)
console.log("Environment:", isProduction ? "production" : "development")

// Configure SSL for production
const sslConfig = isProduction
  ? {
      ca: fs.readFileSync(caCertPath).toString(),
      rejectUnauthorized: true,
    }
  : false

// Create the database pool with detailed error handling
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslConfig,
})

// Create a Drizzle instance with the connection pool and schema
export const db = drizzle(pool, { schema })

// Export the pool for direct access if needed
export { pool }
