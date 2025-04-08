import type { Config } from "drizzle-kit"
import * as dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? ".env" : ".env.development"
dotenv.config({ path: envFile })

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Parse the database URL
const url = new URL(databaseUrl)
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1), // Remove leading slash
}

// Configure SSL for production
const isProduction = process.env.NODE_ENV === "production"
const serverRoot = path.resolve(process.cwd(), "src/server")
const caCertPath = path.join(serverRoot, "certs", "us-east-2-bundle.pem")

console.log(
  "Using database configuration for:",
  isProduction ? "production" : "development"
)
console.log("Host:", dbConfig.host)
console.log("Database:", dbConfig.database)
console.log("SSL Certificate Path:", caCertPath)

// Verify SSL certificate exists in production
if (isProduction && !fs.existsSync(caCertPath)) {
  throw new Error(`SSL certificate not found at ${caCertPath}`)
}

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: isProduction
      ? {
          ca: fs.readFileSync(caCertPath).toString(),
          rejectUnauthorized: true,
        }
      : false,
  },
} satisfies Config
