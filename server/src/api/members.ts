/*
 * Members API
 *
 * Maintain the members roster.
 */
import { Request, Response, NextFunction, Router } from "express";
import Multer from "multer";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	memberCreatesSchema,
	memberUpdatesSchema,
	memberIdsSchema,
	UpdateRosterOptions,
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
} from "../services/members.js";

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
	const group = req.group!;
	const groupId = group.id;
	try {
		const data = await getMembers({ groupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	const { body } = req;
	const groupId = req.group!.id;
	try {
		const members = memberCreatesSchema.parse(body);
		const data = await addMembers(groupId, members);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	const { body } = req;
	const groupId = req.group!.id;
	try {
		const updates = memberUpdatesSchema.parse(body);
		const data = await updateMembers(groupId, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateOne(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const id = Number(req.params.id);
	const changes = req.body;
	try {
		if (typeof changes !== "object")
			throw new TypeError("Bad or missing body; expected object");
		const data = await updateMembers(group.id, [{ id, changes }]);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	const { body } = req;
	const group = req.group!;
	try {
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
	const { body, params } = req;
	const group = req.group!;
	const id = Number(params.id);
	try {
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
	const { body, params } = req;
	const group = req.group!;
	const id = Number(params.id);
	try {
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
	const { body, params } = req;
	const group = req.group!;
	const id = Number(params.id);
	try {
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
	const { body, params } = req;
	const group = req.group!;
	const id = Number(params.id);
	try {
		if (typeof body !== "object")
			throw new TypeError("Missing or bad ContactEmails row object");
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
	const entry = req.body;
	try {
		if (typeof entry !== "object")
			throw new TypeError("Missing or bad ContactEmails row object");
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
	const group = req.group!;
	const id = Number(req.params.id);
	const entry = req.body;
	try {
		if (typeof entry !== "object")
			throw new TypeError("Missing or bad ContactEmails row object");
		const data = await deleteMemberContactEmail(group.id, id, entry);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getUser(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	try {
		const data = await getUserMembers(access, group.id);
		res.json(data);
	} catch (error) {
		next(error);
	}
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

async function postUpload(req: Request, res: Response, next: NextFunction) {
	const { file } = req;
	const group = req.group!;
	const { format } = req.params;
	try {
		if (!file) return next(new TypeError("Missing file"));
		const data = await uploadMembers(group.id, format, file);
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
	const { file } = req;
	const group = req.group!;
	try {
		if (!file) throw new TypeError("Missing file");
		const data = await importMyProjectRoster(group.id, file);
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
	const { user, query, file } = req;
	const group = req.group!;
	const options: UpdateRosterOptions = {};
	if (query.appendNew === "true") options.appendNew = true;
	if (query.removeUnchanged === "true") options.removeUnchanged = true;
	try {
		if (!file) throw new TypeError("Missing file");
		await updateMyProjectRosterWithMemberStatus(
			user,
			group.id,
			file,
			options,
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
	const { user } = req;
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	try {
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMyProjectRoster(user, group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getPublic(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	try {
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMembersPublic(group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getPrivate(req: Request, res: Response, next: NextFunction) {
	const { user } = req;
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	try {
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportMembersPrivate(user, group.id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function getVoters(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const access = group.permissions.members || AccessLevel.none;
	const forPlenary = Boolean(req.query.plenary);
	const forDVL = Boolean(req.query.dvl);
	try {
		if (access < AccessLevel.admin) throw new ForbiddenError();
		await exportVotingMembers(group, forPlenary, forDVL, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

const router = Router();
const upload = Multer();

router
	.all("*", validatePermissions)
	.get("/user", getUser)
	.get("/snapshot", getSnapshot)
	.post("/upload/:format", upload.single("File"), postUpload)
	.post("/MyProjectRoster", upload.single("File"), postMyProjectRoster)
	.patch("/MyProjectRoster", upload.single("file"), patchMyProjectRoster)
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
