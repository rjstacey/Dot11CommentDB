/*
 * Webex accounts and meetings API
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	webexAccountCreateSchema,
	webexAccountChangeSchema,
	webexMeetingDeletesSchema,
	webexMeetingChangesSchema,
	webexMeetingCreatesSchema,
	webexMeetingsQuerySchema,
} from "@schemas/webex.js";
import {
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	getWebexMeetings,
	addWebexMeetings,
	updateWebexMeetings,
	revokeAuthWebexAccount,
	deleteWebexMeetings,
} from "../services/webex.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.meetings || AccessLevel.none;
		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "DELETE" || req.method === "POST") &&
				access >= AccessLevel.admin);

		if (grant) {
			next();
			return;
		}
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function getAccounts(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	try {
		const data = await getWebexAccounts(req, user, { groupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addAccount(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	try {
		const account = webexAccountCreateSchema.parse(req.body);
		const data = await addWebexAccount(req, user, groupId, account);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateAccount(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	if (isNaN(accountId)) {
		next(new BadRequestError("Path parameter :accountId not a number"));
		return;
	}
	try {
		const changes = webexAccountChangeSchema.parse(req.body);
		const data = await updateWebexAccount(
			req,
			user,
			groupId,
			accountId,
			changes
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function revokeAccountAuth(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const user = req.user;
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	if (isNaN(accountId)) {
		next(new BadRequestError("Path parameter :accountId not a number"));
		return;
	}
	try {
		const data = await revokeAuthWebexAccount(
			req,
			user,
			groupId,
			accountId
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeAccount(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	if (isNaN(accountId)) {
		next(new BadRequestError("Path parameter :accountId not a number"));
		return;
	}
	try {
		const data = await deleteWebexAccount(groupId, accountId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getMeetings(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	try {
		let query = webexMeetingsQuerySchema.parse(req.query);
		query = { ...query, groupId };
		const data = await getWebexMeetings(query);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMeetings(req: Request, res: Response, next: NextFunction) {
	try {
		const webexMeetings = webexMeetingCreatesSchema.parse(req.body);
		const data = await addWebexMeetings(webexMeetings);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMeetings(req: Request, res: Response, next: NextFunction) {
	try {
		const webexMeetings = webexMeetingChangesSchema.parse(req.body);
		const data = await updateWebexMeetings(webexMeetings);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMeetings(req: Request, res: Response, next: NextFunction) {
	try {
		const webexMeetings = webexMeetingDeletesSchema.parse(req.body);
		const data = await deleteWebexMeetings(webexMeetings);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.all(/(.*)/, validatePermissions)
	.route("/accounts")
	.get(getAccounts)
	.post(addAccount);
router
	.patch("/accounts/:accountId", updateAccount)
	.patch("/accounts/:accountId/revoke", revokeAccountAuth)
	.delete("/accounts/:accountId", removeAccount);
router
	.route("/meetings")
	.get(getMeetings)
	.post(addMeetings)
	.patch(updateMeetings)
	.delete(removeMeetings);

export default router;
