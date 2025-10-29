import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const secret = process.env.NODE_ENV === "development" ? "secret" : uuidv4();

/**
 * Sign the user ID (SAPIN) and return as JWT token
 */
export const generateToken = (userId: number) =>
	jwt.sign(userId.toString(), secret);

/**
 * Verify the JWT token and return the user ID (SAPIN)
 */
export const verifyToken = (token: string) => Number(jwt.verify(token, secret));
