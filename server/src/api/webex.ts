/*
 * Webex accounts and meetings API
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	webexAccountCreateSchema,
	webexAccountChangeSchema,
	WebexAccountCreate,
	WebexAccountChange,
	webexMeetingDeletesSchema,
	webexMeetingChangesSchema,
	webexMeetingCreatesSchema,
	webexMeetingsQuerySchema,
} from "@schemas/webex";
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
} from "../services/webex";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) return next(new Error("Group not set"));

	const access = req.group.permissions.meetings || AccessLevel.none;

	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (
		(req.method === "DELETE" || req.method === "POST") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function getAccounts(req: Request, res: Response, next: NextFunction) {
	getWebexAccounts(req, req.user, { groupId: req.group!.id })
		.then((data) => res.json(data))
		.catch(next);
}

function addAccount(req: Request, res: Response, next: NextFunction) {
	let account: WebexAccountCreate;
	try {
		account = webexAccountCreateSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addWebexAccount(req, req.user, req.group!.id, account)
		.then((data) => res.json(data))
		.catch(next);
}

function updateAccount(req: Request, res: Response, next: NextFunction) {
	const accountId = Number(req.params.accountId);
	let changes: WebexAccountChange;
	try {
		changes = webexAccountChangeSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateWebexAccount(req, req.user, req.group!.id, accountId, changes)
		.then((data) => res.json(data))
		.catch(next);
}

function revokeAccountAuth(req: Request, res: Response, next: NextFunction) {
	const accountId = Number(req.params.accountId);
	revokeAuthWebexAccount(req, req.user, req.group!.id, accountId)
		.then((data) => res.json(data))
		.catch(next);
}

function removeAccount(req: Request, res: Response, next: NextFunction) {
	const accountId = Number(req.params.accountId);
	deleteWebexAccount(req.group!.id, accountId)
		.then((data) => res.json(data))
		.catch(next);
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
	.all("*", validatePermissions)
	.route("/accounts")
	.get(getAccounts)
	.post(addAccount);
router
	.patch("/accounts/:accountId(\\d+)", updateAccount)
	.patch("/accounts/:accountId(\\d+)/revoke", revokeAccountAuth)
	.delete("/accounts/:accountId(\\d+)", removeAccount);
router
	.route("/meetings")
	.get(getMeetings)
	.post(addMeetings)
	.patch(updateMeetings)
	.delete(removeMeetings);

export default router;
