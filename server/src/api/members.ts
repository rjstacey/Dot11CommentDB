/*
 * Members API
 *
 * Maintain the members roster.
 *
 * GET /users: returns the complete array of user entries in the database.
 * PUT /user/{userId}: updates entry for a specific user ID. Returns the complete entry for the updated user.
 * POST /user: adds a user to the database. Returns the complete entry for the user added.
 * DELETE /users: deletes users from list of user IDs. Returns null.
 * POST /users/upload: insert users from file. Returns the complete array of user entries in the database.
 * POST /users: insert or update users. Returns the complete entry for the user added.
 */
import { Router } from "express";
import Multer from "multer";
import { ForbiddenError, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";
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
	exportVotingMembers
} from "../services/members";

const router = Router();
const upload = Multer();

router
	.all("*", (req, res, next) => {
		const { group } = req;
		if (!group) return next(new Error("Group not set"));

		const access = group.permissions.members || AccessLevel.none;

		// Getting a list of user members requires ro access */
		if (req.method === "GET" && req.path === "/users" && access >= AccessLevel.ro) return next();

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
	})
	.get("/user", (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		getUserMembers(access, group.id)
			.then((data) => res.json(data))
			.catch(next);
	})
	.get("/snapshot", async (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		try {
			const { date } = req.body;
			const data = await getMembersSnapshot(access, group.id, date);
			res.json(data);
		} catch (err) {
			next(err);
		}
	})
	.post("/upload/:format", upload.single("File"), async (req, res, next) => {
		const group = req.group!;
		const { format } = req.params;
		if (!req.file) return next(new TypeError("Missing file"));
		uploadMembers(group.id, format, req.file)
			.then((data) => res.json(data))
			.catch(next);
	})
	.post("/MyProjectRoster", upload.single("File"), (req, res, next) => {
		const group = req.group!;
		if (!req.file) return next(new TypeError("Missing file"));
		importMyProjectRoster(group.id, req.file)
			.then((data) => res.json(data))
			.catch(next);
	})
	.get("/MyProjectRoster", (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin)
			next(new ForbiddenError("Insufficient karma"));
		exportMyProjectRoster(req.user, group.id, res)
			.then(() => res.end())
			.catch(next);
	})
	.get("/public", (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin)
			next(new ForbiddenError("Insufficient karma"));
		exportMembersPublic(group.id, res)
			.then(() => res.end())
			.catch(next);
	})
	.get("/private", (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin)
			next(new ForbiddenError("Insufficient karma"));
		exportMembersPrivate(group.id, res)
			.then(() => res.end())
			.catch(next);
	})
	.get("/voters", (req, res, next) => {
		const group = req.group!;
		const access = group.permissions.members || AccessLevel.none;
		if (access < AccessLevel.admin)
			next(new ForbiddenError("Insufficient karma"));
		const forPlenary = Boolean(req.query.plenary);
		exportVotingMembers(group.id, forPlenary, res)
			.then(() => res.end())
			.catch(next);
	})
	.route("/")
		.get((req, res, next) => {
			const group = req.group!;
			const access = group.permissions.members || AccessLevel.none;
			getMembers(access, {groupId: group.id})
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const group = req.group!;
			const members = req.body;
			if (!Array.isArray(members))
				return next(
					new TypeError("Bad or missing array of member objects")
				);
			if (!members.every((member) => isPlainObject(member)))
				return next(new TypeError("Expected an array of objects"));
			addMembers(group.id, members)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const group = req.group!;
			const updates = req.body;
			if (!Array.isArray(updates))
				return next(
					new TypeError("Bad or missing array of update objects")
				);
			if (
				!updates.every(
					(u) =>
						isPlainObject(u) &&
						typeof u.id === "number" &&
						isPlainObject(u.changes)
				)
			)
				return next(
					new TypeError(
						"Expected an array of objects with shape {id, changes}"
					)
				);
			updateMembers(group.id, updates)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const group = req.group!;
			const ids = req.body;
			if (!Array.isArray(ids))
				return next(
					new TypeError("Bad or missing array of member identifiers")
				);
			if (!ids.every((id) => typeof id === "number"))
				return next(new TypeError("Expected an array of numbers"));
			deleteMembers(group.id, ids)
				.then((data) => res.json(data))
				.catch(next);
		});

router.patch("/:id(\\d+)$", async (req, res, next) => {
	const group = req.group!;
	const id = Number(req.params.id);
	const changes = req.body;
	if (typeof changes !== "object")
		return next(new TypeError("Bad or missing body; expected object"));
	updateMembers(group.id, [{ id, changes }])
		.then((data) => res.json(data))
		.catch(next);
});

router
	.route("/:id(\\d+)/StatusChangeHistory")
		.put((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			addMemberStatusChangeEntries(group.id, id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			updateMemberStatusChangeEntries(group.id, id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			deleteMemberStatusChangeEntries(group.id, id, req.body)
				.then((data) => res.json(data))
				.catch(next);
		});

router
	.route("/:id(\\d+)/ContactEmails")
		.patch((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			const entry = req.body;
			if (typeof entry !== "object")
				return next(
					new TypeError("Missing or bad ContactEmails row object")
				);
			updateMemberContactEmail(group.id, id, entry)
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			const entry = req.body;
			if (typeof entry !== "object")
				return next(
					new TypeError("Missing or bad ContactEmails row object")
				);
			addMemberContactEmail(group.id, id, entry)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const group = req.group!;
			const id = Number(req.params.id);
			const entry = req.body;
			if (typeof entry !== "object")
				return next(
					new TypeError("Missing or bad ContactEmails row object")
				);
			deleteMemberContactEmail(group.id, id, entry)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
