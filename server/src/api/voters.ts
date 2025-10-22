/*
 * Voters API
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import { selectWorkingGroup } from "../services/groups.js";
import {
	voterCreatesSchema,
	voterUpdatesSchema,
	voterIdsSchema,
	voterMemberSnapshotParamsSchema,
} from "@schemas/voters.js";
import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	uploadVoters,
	votersFromMembersSnapshot,
	exportVoters,
} from "../services/voters.js";

function workingGroupOrThrow(req: Request) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		throw new NotFoundError(
			`Can't find working group for ${req.groups![0].id}`
		);
	}
	return workingGroup;
}

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
	const access = req.permissions?.voters || AccessLevel.none;
	const grant =
		(req.method === "GET" && access >= AccessLevel.ro) ||
		(req.method === "PATCH" && access >= AccessLevel.rw) ||
		access >= AccessLevel.admin;

	if (grant) {
		next();
		return;
	}

	next(new ForbiddenError());
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const ballot_id = req.ballot!.id;
		const data = await getVoters({ ballot_id });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroup = workingGroupOrThrow(req);
		const ballot = req.ballot!;
		const voters = voterCreatesSchema.parse(req.body);
		const data = await addVoters(workingGroup.id, ballot.id, voters);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroup = workingGroupOrThrow(req);
		const updates = voterUpdatesSchema.parse(req.body);
		const data = await updateVoters(workingGroup.id, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const ids = voterIdsSchema.parse(req.body);
		const data = await deleteVoters(ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getExport(req: Request, res: Response, next: NextFunction) {
	await exportVoters(req.user, req.ballot!, res);
	next();
}

async function postUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroup = workingGroupOrThrow(req);
		const ballot = req.ballot!;
		const { filename, buffer } = fileBufferOrThrow(req);

		const data = await uploadVoters(
			workingGroup.id,
			ballot.id,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postMembersnapshot(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = req.user;
		const workingGroup = workingGroupOrThrow(req);
		const ballot = req.ballot!;
		const params = voterMemberSnapshotParamsSchema.parse(req.body);
		const { date } = params;
		const data = await votersFromMembersSnapshot(
			user,
			workingGroup.id,
			ballot.id,
			date
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();

router.all(/(.*)/, validatePermissions);
router.route("/").get(get).patch(updateMany).post(addMany).delete(removeMany);
router
	.get("/export", getExport)
	.post("/upload", postUpload)
	.post("/membersSnapshot", postMembersnapshot);

export default router;
