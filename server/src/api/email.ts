import { Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	sendEmail,
	getTemplates,
	addTemplates,
	updateTemplates,
	deleteTemplates,
	validateEmail,
	validEmailTemplateCreates,
	validEmailTemplateUpdates,
	validEmailTemplateIds,
} from "../services/email";

const router = Router();

router
	.all("*", (req, res, next) => {
		const { group, user } = req;
		if (!group) return next(new Error("Group not set"));

		const access = Math.max(
			group.permissions.members || AccessLevel.none,
			user.Access
		);
		if (access >= AccessLevel.admin) return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.post("/send", (req, res, next) => {
		const { user, body } = req;
		try {
			validateEmail(body);
		} catch (error) {
			return next(error);
		}
		sendEmail(user, body)
			.then((data) => res.json(data))
			.catch(next);
	})
	.route("/templates")
	.get((req, res, next) => {
		getTemplates(req.group!)
			.then((data) => res.json(data))
			.catch(next);
	})
	.patch((req, res, next) => {
		const group = req.group!;
		const updates = req.body;
		if (!validEmailTemplateUpdates(updates))
			return next(
				new TypeError("Bad or missing array of update objects")
			);
		updateTemplates(group, updates)
			.then((data) => res.json(data))
			.catch(next);
	})
	.post((req, res, next) => {
		const group = req.group!;
		const templates = req.body;
		if (!validEmailTemplateCreates(templates))
			return next(
				new TypeError("Bad or missing array of email template objects")
			);
		addTemplates(group, templates)
			.then((data) => res.json(data))
			.catch(next);
	})
	.delete((req, res, next) => {
		const group = req.group!;
		const ids = req.body;
		if (!validEmailTemplateIds(ids))
			return next(
				new TypeError(
					"Bad or missing array of email template identifiers"
				)
			);
		deleteTemplates(group, ids)
			.then((data) => res.json(data))
			.catch(next);
	});

export default router;
