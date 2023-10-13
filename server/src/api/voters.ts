/*
 * Voters API
 */
import { Router } from "express";
import Multer from "multer";
import { ForbiddenError, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	votersFromSpreadsheet,
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
		.get((req, res, next) => {
			const ballot_id = req.ballot!.id;
			getVoters({ ballot_id })
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			updateVoters(req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const ballot_id = req.ballot!.id;
			addVoters(ballot_id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			deleteVoters(req.body)
				.then((data) => res.json(data))
				.catch(next);
		});

router
	.get("/export", (req, res, next) => {
		const ballot_id = req.ballot!.id;
		exportVoters(ballot_id, res).catch(next);
	})
	.post("/upload", upload.single("File"), (req, res, next) => {
		const ballot_id = req.ballot!.id;
		if (!req.file) return next(new TypeError("Missing file"));
		votersFromSpreadsheet(ballot_id, req.file)
			.then((data) => res.json(data))
			.catch(next);
	})
	.post("/membersSnapshot", (req, res, next) => {
		const ballot_id = req.ballot!.id;
		if (!isPlainObject(req.body) || !req.body.hasOwnProperty("date"))
			return next(
				new TypeError(
					"Bad or missing body; expected object with shape {date: string}"
				)
			);
		const { date } = req.body;
		votersFromMembersSnapshot(ballot_id, date)
			.then((data) => res.json(data))
			.catch(next);
	});

export default router;
