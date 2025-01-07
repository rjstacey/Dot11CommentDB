/*
 * Voters API
 */
import { Request, Response, NextFunction, Router } from "express";
import Multer from "multer";
import { ForbiddenError, NotFoundError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import { selectWorkingGroup } from "../services/groups.js";
import {
	VoterCreate,
	VoterUpdate,
	voterCreatesSchema,
	voterUpdatesSchema,
	voterIdsSchema,
	voterMemberSnapshotParamsSchema,
	VoterMemberSnapshotParams,
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

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.voters || AccessLevel.none;
	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (access >= AccessLevel.admin) return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	const ballot_id = req.ballot!.id;
	getVoters({ ballot_id })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	const ballot = req.ballot!;
	let voters: VoterCreate[];
	try {
		voters = voterCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addVoters(workingGroup.id, ballot.id, voters)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
	let updates: VoterUpdate[];
	try {
		updates = voterUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateVoters(workingGroup.id, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: string[];
	try {
		ids = voterIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteVoters(ids)
		.then((data) => res.json(data))
		.catch(next);
}

function getExport(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	const ballot = req.ballot!;
	exportVoters(workingGroup.id, ballot.id, res).catch(next);
}

function postUpload(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	const ballot = req.ballot!;
	if (!req.file) return next(new TypeError("Missing file"));
	uploadVoters(workingGroup.id, ballot.id, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postMembersnapshot(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	const ballot = req.ballot!;
	let params: VoterMemberSnapshotParams;
	try {
		params = voterMemberSnapshotParamsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	const { date } = req.body;
	votersFromMembersSnapshot(user, workingGroup.id, ballot.id, params.date)
		.then((data) => res.json(data))
		.catch(next);
}

const upload = Multer();
const router = Router();

router.all("*", validatePermissions);
router.route("/").get(get).patch(updateMany).post(addMany).delete(removeMany);
router
	.get("/export", getExport)
	.post("/upload", upload.single("File"), postUpload)
	.post("/membersSnapshot", postMembersnapshot);

export default router;
