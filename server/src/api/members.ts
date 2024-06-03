/*
 * Members API
 *
 * Maintain the members roster.
 */
import { Request, Response, NextFunction, Router } from "express";
import Multer from "multer";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	memberCreatesSchema,
	MemberCreate,
	memberUpdatesSchema,
	MemberUpdate,
	memberIdsSchema,
} from "../schemas/members";
import {
	getMembers,
	getUserMembers,
	getMembersSnapshot,
	updateMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	addMemberContactEmail,
	updateMemberContactEmail,
	deleteMemberContactEmail,
	addMembers,
	deleteMembers,
	uploadMembers,
	importMyProjectRoster,
	exportMyProjectRoster,
	exportMembersPublic,
	exportMembersPrivate,
	exportVotingMembers,
} from "../services/members";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const { group } = req;
	if (!group) return next(new Error("Group not set"));

	const access = group.permissions.members || AccessLevel.none;

	// Getting a list of user members requires ro access */
	if (
		req.method === "GET" &&
		req.path === "/users" &&
		access >= AccessLevel.ro
	)
		return next();

	// Otherwise need at least rw access */
	if (req.method === "GET" && access >= AccessLevel.rw) return next();

	// Need read-write privileges to update resolutions
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	// Need admin privileges to add or delete resolutions
	if (
		(req.method === "DELETE" || req.method === "POST") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	getMembers(access, { groupId: group.id })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let members: MemberCreate[];
	try {
		members = memberCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addMembers(group.id, members)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let updates: MemberUpdate[];
	try {
		updates = memberUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateMembers(group.id, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function updateOne(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const id = Number(req.params.id);
	const changes = req.body;
	if (typeof changes !== "object")
		return next(new TypeError("Bad or missing body; expected object"));
	updateMembers(group.id, [{ id, changes }])
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let ids: number[];
	try {
		ids = memberIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteMembers(group.id, ids)
		.then((data) => res.json(data))
		.catch(next);
}

function statusChangeHistory_addMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	addMemberStatusChangeEntries(group.id, id, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function statusChangeHistory_updateMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	updateMemberStatusChangeEntries(group.id, id, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function statusChangeHistory_removeMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	deleteMemberStatusChangeEntries(group.id, id, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function contactEmails_addOne(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const id = Number(req.params.id);
	const entry = req.body;
	if (typeof entry !== "object")
		return next(new TypeError("Missing or bad ContactEmails row object"));
	addMemberContactEmail(group.id, id, entry)
		.then((data) => res.json(data))
		.catch(next);
}

function contactEmails_updateOne(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	const entry = req.body;
	if (typeof entry !== "object")
		return next(new TypeError("Missing or bad ContactEmails row object"));
	updateMemberContactEmail(group.id, id, entry)
		.then((data) => res.json(data))
		.catch(next);
}

function contactEmails_removeOne(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	const entry = req.body;
	if (typeof entry !== "object")
		return next(new TypeError("Missing or bad ContactEmails row object"));
	deleteMemberContactEmail(group.id, id, entry)
		.then((data) => res.json(data))
		.catch(next);
}

function getUser(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	getUserMembers(access, group.id)
		.then((data) => res.json(data))
		.catch(next);
}

async function getSnapshot(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	try {
		const { date } = req.body;
		const data = await getMembersSnapshot(access, group.id, date);
		res.json(data);
	} catch (err) {
		next(err);
	}
}

function postUpload(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const { format } = req.params;
	if (!req.file) return next(new TypeError("Missing file"));
	uploadMembers(group.id, format, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postMyProjectRoster(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	if (!req.file) return next(new TypeError("Missing file"));
	importMyProjectRoster(group.id, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function getMyProjectRoster(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		next(new ForbiddenError("Insufficient karma"));
	exportMyProjectRoster(req.user, group.id, res)
		.then(() => res.end())
		.catch(next);
}

function getPublic(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		return next(new ForbiddenError("Insufficient karma"));
	exportMembersPublic(group.id, res)
		.then(() => res.end())
		.catch(next);
}

function getPrivate(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		return next(new ForbiddenError("Insufficient karma"));
	exportMembersPrivate(group.id, res)
		.then(() => res.end())
		.catch(next);
}

function getVoters(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		return next(new ForbiddenError("Insufficient karma"));
	const forPlenary = Boolean(req.query.plenary);
	exportVotingMembers(group.id, forPlenary, res)
		.then(() => res.end())
		.catch(next);
}

const router = Router();
const upload = Multer();

router
	.all("*", validatePermissions)
	.get("/user", getUser)
	.get("/snapshot", getSnapshot)
	.post("/upload/:format", upload.single("File"), postUpload)
	.post("/MyProjectRoster", upload.single("File"), postMyProjectRoster)
	.get("/MyProjectRoster", getMyProjectRoster)
	.get("/public", getPublic)
	.get("/private", getPrivate)
	.get("/voters", getVoters);

router.route("/").get(get).post(addMany).patch(updateMany).delete(removeMany);

router.route("/:id(\\d+)").patch(updateOne);

router
	.route("/:id(\\d+)/StatusChangeHistory")
	.put(statusChangeHistory_addMany)
	.patch(statusChangeHistory_updateMany)
	.delete(statusChangeHistory_removeMany);

router
	.route("/:id(\\d+)/ContactEmails")
	.post(contactEmails_addOne)
	.patch(contactEmails_updateOne)
	.delete(contactEmails_removeOne);

export default router;
