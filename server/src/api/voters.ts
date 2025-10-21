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
	if (req.method === "GET" && access >= AccessLevel.ro) {
		next();
		return;
	}
	if (req.method === "PATCH" && access >= AccessLevel.rw) {
		next();
		return;
	}
	if (access >= AccessLevel.admin) {
		next();
		return;
	}

	next(new ForbiddenError());
}

function get(req: Request, res: Response, next: NextFunction) {
	const ballot_id = req.ballot!.id;
	getVoters({ ballot_id })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}

	const ballot = req.ballot!;
	let voters: VoterCreate[];
	try {
		voters = voterCreatesSchema.parse(req.body);
	} catch (error) {
		next(error);
		return;
	}
	addVoters(workingGroup.id, ballot.id, voters)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}
	let updates: VoterUpdate[];
	try {
		updates = voterUpdatesSchema.parse(req.body);
	} catch (error) {
		next(error);
		return;
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
	exportVoters(req.user, req.ballot!, res).catch(next);
}

function postUpload(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}

	const ballot = req.ballot!;

	if (!req.body) {
		next(new BadRequestError("Missing file"));
		return;
	}
	let filename = "";
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) filename = m[1];
	}

	uploadVoters(workingGroup.id, ballot.id, filename, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function postMembersnapshot(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}

	const ballot = req.ballot!;
	let params: VoterMemberSnapshotParams;
	try {
		params = voterMemberSnapshotParamsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	votersFromMembersSnapshot(user, workingGroup.id, ballot.id, params.date)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();

router.all(/(.*)/, validatePermissions);
router.route("/").get(get).patch(updateMany).post(addMany).delete(removeMany);
router
	.get("/export", getExport)
	.post("/upload", postUpload)
	.post("/membersSnapshot", postMembersnapshot);

export default router;
