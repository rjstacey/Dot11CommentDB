import { NextFunction, Request, Response, Router } from "express";
import { IeeeClient } from "../utils/index.js";
import { selectUser, getUser, setUser, delUser } from "../services/users.js";
import { verify, token } from "./jwt.js";
import { AccessLevel } from "./access.js";

/*
 * login API
 *
 * GET /login: get current user information
 * POST /login: login with supplied credentials and return user information
 * POST /logout: logout
 */

/** For current user context, get user information. Return null for user information if not logged in. */
async function getLogin(req: Request, res: Response) {
	try {
		const userId = Number(verify(req));
		const { ieeeClient, ...user } = await getUser(userId);
		res.json({ user });
	} catch {
		res.json({ user: null });
	}
}

/** Login with supplied credentials. Return user information if successful. */
async function postLogin(req: Request, res: Response, next: NextFunction) {
	try {
		// credentials
		const { username, password } = req.body;

		const ieeeClient = new IeeeClient();
		const { SAPIN, Name, Email } = await ieeeClient.login(
			username,
			password
		);
		//const SAPIN = 5073, Name = "Robert Stacey", Email= "rjstacey@gmail.com";

		const user = (await selectUser({ SAPIN, Email })) || {
			SAPIN,
			Name,
			Email,
			Access: AccessLevel.none,
			Permissions: [],
		};

		user.Token = token(user.SAPIN);
		setUser(user.SAPIN, { ...user, ieeeClient });

		res.json({ user });
	} catch (err) {
		next(err);
	}
}

/** Logout. Remove user context and return null for user information. */
async function postLogout(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = Number(verify(req));
		const user = await getUser(userId);
		if (user) {
			const { ieeeClient } = user;
			if (ieeeClient) ieeeClient.logout();
			delUser(user.SAPIN);
		}
		res.json({ user: null });
	} catch (err) {
		next(err);
	}
}

const router = Router();
router
	.get("/login", getLogin)
	.post("/login", postLogin)
	.post("/logout", postLogout);

export default router;
