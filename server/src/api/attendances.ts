/*
 * Attendances API
 *
 */
import { Router } from "express";
import { AccessLevel } from "../auth/access";
import { ForbiddenError } from "../utils";

import {
	getAttendances,
	getRecentAttendances,
	addAttendances,
	updateAttendances,
	deleteAttendances,
	importAttendances,
	exportAttendancesForMinutes,
	validAttendances,
	validAttendanceUpdates,
	validAttendanceIds,
} from "../services/attendances";

const router = Router();

router
	.all("*", (req, res, next) => {
		if (!req.group) return next(new Error("Group not set"));

		const access = req.group.permissions.members || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro) return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
		if (
			(req.method === "DELETE" || req.method === "POST") &&
			access >= AccessLevel.admin
		)
			return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.get("/:session_id(\\d+)", async (req, res, next) => {
		const group = req.group!;
		const session_id = Number(req.params.session_id);
		getAttendances(group.id, session_id)
			.then((data) => res.json(data))
			.catch(next);
	})
	.get("/:session_id(\\d+)/exportForMinutes", async (req, res, next) => {
		const session_id = Number(req.params.session_id);
		exportAttendancesForMinutes(req.user, req.group!, session_id, res)
			.then(() => res.end())
			.catch(next);
	})
	.post("/:session_id(\\d+)/import", async (req, res, next) => {
		const session_id = Number(req.params.session_id);
		const { use } = req.query;
		let useDailyAttendance =
			typeof use === "string" && use.toLowerCase().startsWith("daily");
		importAttendances(req.user, req.group!, session_id, useDailyAttendance)
			.then((data) => res.json(data))
			.catch(next);
	})
	.route("/")
		.get((req, res, next) => {
			const user = req.user;
			const group = req.group!;
			getRecentAttendances(user, group.id)
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const group = req.group!;
			const attendances = req.body;
			if (!validAttendances(attendances))
				return next(
					new TypeError(
						"Missing or bad body; expected an array of attendance objects"
					)
				);
			addAttendances(group.id, attendances)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			if (!validAttendanceUpdates(updates))
				return next(
					new TypeError(
						"Missing or bad body; expected array of updates with shape {id, changes}"
					)
				);
			updateAttendances(updates)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			if (!validAttendanceIds(ids))
				return next(
					new TypeError(
						"Missing or bad body; expected array of attendance ids"
					)
				);
			deleteAttendances(ids)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
