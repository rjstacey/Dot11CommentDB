import { Request, Response, NextFunction } from "express";
import { AuthError, ForbiddenError, NotFoundError } from "@/utils/index.js";
import { verifyToken } from "./jwt.js";
import { getUser } from "@/services/users.js";

/*
 * Express middleware to authorize a request.
 * Validates the token, looks up the user associated with the token
 * and stores as req.user
 */
export async function authorize(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		let userId: number;
		try {
			const token = req.header("Authorization")!.replace("Bearer ", "");
			userId = verifyToken(token);
		} catch {
			console.warn("unauthorized");
			next(new AuthError());
			return;
		}
		const user = await getUser(userId);
		if (!user) {
			next(new NotFoundError("Unknown user"));
			return;
		}
		req.user = user;
		next();
	} catch (error) {
		//console.log(error);
		let msg: string | undefined;
		if (error instanceof Error) msg = error.message;
		next(new ForbiddenError(msg));
	}
}
