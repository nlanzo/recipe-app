import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import "dotenv/config"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as schema from "./schema.js"

const { Pool } = pg
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const caCertPath =
  process.env.PG_SSL_CA ||
  path.join(__dirname, "..", "certs", "us-east-2-bundle.pem")

console.log("Database URL:", connectionString.replace(/:[^:]*@/, "@"))
console.log("SSL Certificate Path:", caCertPath)

const pool = new Pool({
  connectionString,
  ssl: {
    ca: fs.readFileSync(caCertPath).toString(),
    rejectUnauthorized: true,
  },
})

export const db = drizzle(pool, { schema })
