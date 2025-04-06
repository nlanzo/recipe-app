import type { Config } from "drizzle-kit"
import * as dotenv from "dotenv"

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

console.log(
  "Using database configuration for:",
  process.env.NODE_ENV || "development"
)
console.log("Host:", dbConfig.host)
console.log("Database:", dbConfig.database)

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
    ssl: process.env.NODE_ENV === "production",
  },
} satisfies Config
