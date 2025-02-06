import "dotenv/config"
import fs from "fs"
import path from "path"
import { drizzle } from "drizzle-orm/node-postgres"
import pkg from "pg"

const { Pool } = pkg

const connectionString = process.env.DATABASE_URL!
const caCertPath =
  process.env.PG_SSL_CA ||
  path.join(process.cwd(), "certs", "us-east-2-bundle.pem")

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(caCertPath),
  },
})
console.log(caCertPath)
export const db = drizzle(pool)
