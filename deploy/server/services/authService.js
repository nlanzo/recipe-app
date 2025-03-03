"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Make sure to add this to .env
class AuthService {
    static register(_a) {
        return __awaiter(this, arguments, void 0, function* ({ username, email, password }) {
            // Check if user already exists
            const existingUser = yield db_1.db
                .select()
                .from(schema_1.usersTable)
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email))
                .limit(1);
            if (existingUser.length > 0) {
                throw new Error("User with this email already exists");
            }
            // Hash password
            const passwordHash = yield bcrypt_1.default.hash(password, SALT_ROUNDS);
            // Create new user
            const [newUser] = yield db_1.db
                .insert(schema_1.usersTable)
                .values({
                username,
                email,
                passwordHash,
            })
                .returning();
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: newUser.id }, JWT_SECRET, {
                expiresIn: "24h",
            });
            return { user: newUser, token };
        });
    }
    static login(_a) {
        return __awaiter(this, arguments, void 0, function* ({ email, password }) {
            // Find user by email
            const [user] = yield db_1.db
                .select()
                .from(schema_1.usersTable)
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email))
                .limit(1);
            if (!user) {
                throw new Error("Invalid credentials");
            }
            // Verify password
            const isValidPassword = yield bcrypt_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                throw new Error("Invalid credentials");
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
                expiresIn: "24h",
            });
            return { user, token };
        });
    }
}
exports.AuthService = AuthService;
