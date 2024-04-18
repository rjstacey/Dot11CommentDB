/*
 * Voters API
 */
import { Router } from "express";
import Multer from "multer";
import { ForbiddenError, NotFoundError, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";
import { selectWorkingGroup } from "../services/groups";
import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	uploadVoters,
	votersFromMembersSnapshot,
	exportVoters,
} from "../services/voters";

const upload = Multer();
const router = Router();

router
	.all("*", (req, res, next) => {
		const access = req.permissions?.voters || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro) return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
		if (access >= AccessLevel.admin) return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.route("/")
		.get(async (req, res, next) => {
			const workingGroup = selectWorkingGroup(req.groups!);
			if (!workingGroup)
				return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

			const ballot_id = req.ballot!.id;
			getVoters(workingGroup.id, { ballot_id })
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch(async (req, res, next) => {
			const workingGroup = selectWorkingGroup(req.groups!);
			if (!workingGroup)
				return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

			updateVoters(workingGroup.id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.post(async (req, res, next) => {
			const workingGroup = selectWorkingGroup(req.groups!);
			if (!workingGroup)
				return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

			const ballot = req.ballot!;
			addVoters(workingGroup.id, ballot.id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			deleteVoters(req.body)
				.then((data) => res.json(data))
				.catch(next);
		});

router
	.get("/export", async (req, res, next) => {
		const workingGroup = selectWorkingGroup(req.groups!);
		if (!workingGroup)
			return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

		const ballot = req.ballot!;
		exportVoters(workingGroup.id, ballot.id, res).catch(next);
	})
	.post("/upload", upload.single("File"), async (req, res, next) => {
		const workingGroup = selectWorkingGroup(req.groups!);
		if (!workingGroup)
			return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

		const ballot = req.ballot!;
		if (!req.file) return next(new TypeError("Missing file"));
		uploadVoters(workingGroup.id, ballot.id, req.file)
			.then((data) => res.json(data))
			.catch(next);
	})
	.post("/membersSnapshot", async (req, res, next) => {
		const user = req.user;
		const workingGroup = selectWorkingGroup(req.groups!);
		if (!workingGroup)
			return next(new NotFoundError(`Can't find working group for ${req.groups![0].id}`));

		const ballot = req.ballot!;
		if (!isPlainObject(req.body) || !req.body.hasOwnProperty("date"))
			return next(
				new TypeError(
					"Bad or missing body; expected object with shape {date: string}"
				)
			);
		const { date } = req.body;
		votersFromMembersSnapshot(user, workingGroup.id, ballot.id, date)
			.then((data) => res.json(data))
			.catch(next);
	});

export default router;
