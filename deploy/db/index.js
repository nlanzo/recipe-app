"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const connectionString = process.env.DATABASE_URL;
const caCertPath = process.env.PG_SSL_CA ||
    path_1.default.join(process.cwd(), "certs", "us-east-2-bundle.pem");
const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: true,
        ca: fs_1.default.readFileSync(caCertPath),
    },
});
console.log(caCertPath);
exports.db = (0, node_postgres_1.drizzle)(pool);
