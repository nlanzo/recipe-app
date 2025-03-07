import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import "dotenv/config"
import fs from "fs"
import path from "path"
import * as schema from "./schema.js"

const { Pool } = pg

// Debug database connection info
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// In production, use the absolute path to the RDS certificate
const isProduction = process.env.NODE_ENV === "production"
const serverRoot = isProduction ? "/home/ec2-user/server" : process.cwd()
const caCertPath = path.join(serverRoot, "certs", "us-east-2-bundle.pem")

// Debug environment and paths
console.log("Database Connection Info:")
console.log("Current working directory:", process.cwd())
console.log("Server root directory:", serverRoot)
console.log("Database URL:", connectionString.replace(/:[^:]*@/, ":****@"))
console.log("SSL Certificate Path:", caCertPath)
console.log("Environment:", isProduction ? "production" : "development")
console.log("Certificate exists:", fs.existsSync(caCertPath))

let sslConfig
try {
  const certContent = fs.readFileSync(caCertPath, "utf8")
  sslConfig = {
    ca: certContent,
    rejectUnauthorized: true,
  }
  console.log("Successfully loaded SSL certificate")
  console.log("Certificate length:", certContent.length)
} catch (error) {
  console.error("Error loading SSL certificate:", error)
  throw error
}

// Create the database pool with detailed error handling
const pool = new Pool({
  connectionString,
  ssl: sslConfig,
})

// Add error handler to the pool
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err)
})

// Test the connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error testing database connection:", err)
  } else {
    console.log("Database connection successful, server time:", res.rows[0].now)
  }
})

export const db = drizzle(pool, { schema })
