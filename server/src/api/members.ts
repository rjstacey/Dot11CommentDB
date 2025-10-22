/*
 * Members API
 *
 * Maintain the members roster.
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	memberCreatesSchema,
	memberUpdatesSchema,
	memberIdsSchema,
	UpdateRosterOptions,
	membersExportQuerySchema,
} from "@schemas/members.js";
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
	updateMyProjectRosterWithMemberStatus,
	exportMembersPublic,
	exportMembersPrivate,
	exportVotingMembers,
	membersExport,
} from "../services/members.js";

function fileBufferOrThrow(req: Request): { filename: string; buffer: Buffer } {
	if (!req.body) throw new BadRequestError("Missing file");
	let filename: string;
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) {
			filename = m[1];
			return { filename, buffer: req.body };
		}
	}
	throw new BadRequestError("Missing filename");
}

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		const { group } = req;
		if (!group) throw new Error("Group not set");

		const access = group.permissions.members || AccessLevel.none;
		const grant =
			// Getting a list of user members requires ro access */
			(req.method === "GET" &&
				req.path === "/user" &&
				access >= AccessLevel.ro) ||
			(req.method === "GET" && access >= AccessLevel.rw) ||
			// Need read-write privileges to update resolutions
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			// Need admin privileges to add or delete resolutions
			((req.method === "DELETE" || req.method === "POST") &&
				access >= AccessLevel.admin);

		if (grant) return next();
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const groupId = group.id;
		const data = await getMembers({ groupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req;
		const groupId = req.group!.id;
		const members = memberCreatesSchema.parse(body);
		const data = await addMembers(groupId, members);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req;
		const groupId = req.group!.id;
		const updates = memberUpdatesSchema.parse(body);
		const data = await updateMembers(groupId, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateOne(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const id = Number(req.params.id);
		const changes = req.body;
		if (typeof changes !== "object")
			throw new BadRequestError("Bad or missing body; expected object");
		const data = await updateMembers(group.id, [{ id, changes }]);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req;
		const group = req.group!;
		const ids = memberIdsSchema.parse(body);
		const data = await deleteMembers(group.id, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function statusChangeHistory_addMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { body, params } = req;
		const group = req.group!;
		const id = Number(params.id);
		const data = await addMemberStatusChangeEntries(group.id, id, body);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function statusChangeHistory_updateMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { body, params } = req;
		const group = req.group!;
		const id = Number(params.id);
		const data = await updateMemberStatusChangeEntries(group.id, id, body);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function statusChangeHistory_removeMany(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { body, params } = req;
		const group = req.group!;
		const id = Number(params.id);
		const data = await deleteMemberStatusChangeEntries(group.id, id, body);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function contactEmails_addOne(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { body, params } = req;
		const group = req.group!;
		const id = Number(params.id);
		if (typeof body !== "object")
			throw new BadRequestError(
				"Missing or bad ContactEmails row object"
			);
		const data = await addMemberContactEmail(group.id, id, body);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function contactEmails_updateOne(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const group = req.group!;
	const id = Number(req.params.id);
	if (isNaN(id)) {
		next(new TypeError("Path parameter :id not a number"));
		return;
	}
	const entry = req.body;
	try {
		if (typeof entry !== "object")
			throw new BadRequestError(
				"Missing or bad ContactEmails row object"
			);
		const data = await updateMemberContactEmail(group.id, id, entry);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function contactEmails_removeOne(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const group = req.group!;
		const id = Number(req.params.id);
		const entry = req.body;
		if (typeof entry !== "object")
			throw new BadRequestError(
				"Missing or bad ContactEmails row object"
			);
		const data = await deleteMemberContactEmail(group.id, id, entry);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getUser(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		const data = await getUserMembers(access, group.id);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const { format } = req.params;
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadMembers(group.id, format, filename, buffer);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postMyProjectRoster(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const group = req.group!;
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await importMyProjectRoster(group.id, filename, buffer);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function patchMyProjectRoster(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user, query } = req;
		const group = req.group!;
		const options: UpdateRosterOptions = {};
		if (query.appendNew === "true") options.appendNew = true;
		if (query.removeUnchanged === "true") options.removeUnchanged = true;
		const { filename, buffer } = fileBufferOrThrow(req);
		await updateMyProjectRosterWithMemberStatus(
			user,
			group.id,
			options,
			filename,
			buffer,
			res
		);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getMyProjectRoster(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user } = req;
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMyProjectRoster(user, group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getPublic(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMembersPublic(group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getPrivate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user } = req;
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMembersPrivate(user, group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getVoters(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		const forPlenary = Boolean(req.query.plenary);
		const forDVL = Boolean(req.query.dvl);
		const date = req.query.date as string | undefined;
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportVotingMembers(group, forPlenary, forDVL, date, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getSnapshot(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const { date } = req.body;
		const data = await getMembersSnapshot(group.id, date);
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function getExportMembers(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin) throw new ForbiddenError();
		const query = membersExportQuerySchema.parse(req.query);
		await membersExport(group, query, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

const router = Router();

router
	.all(/(.*)/, validatePermissions)
	.get("/user", getUser)
	.post("/upload/:format", postUpload)
	.post("/MyProjectRoster", postMyProjectRoster)
	.patch("/MyProjectRoster", patchMyProjectRoster)
	.get("/MyProjectRoster", getMyProjectRoster)
	.get("/public", getPublic)
	.get("/private", getPrivate)
	.get("/voters", getVoters)
	.get("/snapshot", getSnapshot)
	.get("/export", getExportMembers);

router.route("/").get(get).post(addMany).patch(updateMany).delete(removeMany);

router.route("/:id").patch(updateOne);

router
	.route("/:id/StatusChangeHistory")
	.put(statusChangeHistory_addMany)
	.patch(statusChangeHistory_updateMany)
	.delete(statusChangeHistory_removeMany);

router
	.route("/:id/ContactEmails")
	.post(contactEmails_addOne)
	.patch(contactEmails_updateOne)
	.delete(contactEmails_removeOne);

export default router;
