import { Request, Response, NextFunction, Router } from "express";
import {
	membershipEventCreatesSchema,
	membershipEventUpdatesSchema,
	membershipEventIdsSchema,
} from "@schemas/membershipOverTime.js";
import {
	getMembershipOverTime,
	updateMembershipOverTimeEvents,
	addMembershipOverTimeEvents,
	removeMembershipOverTimeEvents,
	uploadMembershipOverTime,
	exportMembershipOverTime,
} from "@/services/membershipOverTime.js";
import { BadRequestError } from "@/utils/index.js";

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

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const data = await getMembershipOverTime({ groupId: group.id });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getExport(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const user = req.user!;
		await exportMembershipOverTime(user, group, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function postUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const { buffer } = fileBufferOrThrow(req);
		const data = await uploadMembershipOverTime(group, buffer);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const membershipEvents = membershipEventCreatesSchema.parse(req.body);
		const data = await addMembershipOverTimeEvents(group, membershipEvents);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const updates = membershipEventUpdatesSchema.parse(req.body);
		const data = await updateMembershipOverTimeEvents(group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const ids = membershipEventIdsSchema.parse(req.body);
		const data = await removeMembershipOverTimeEvents(group, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.post("/upload", postUpload)
	.get("/export", getExport)
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
