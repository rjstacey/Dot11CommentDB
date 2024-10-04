import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getTemplates,
	addTemplates,
	updateTemplates,
	deleteTemplates,
} from "../services/emailTemplates";
import { sendEmail } from "../services/emailSend";
import {
	Email,
	EmailTemplateCreate,
	EmailTemplateUpdate,
	emailSchema,
	emailTemplateCreatesSchema,
	emailTemplateIdsSchema,
	emailTemplateUpdatesSchema,
} from "../schemas/email";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const { group, user } = req;
	if (!group) return next(new Error("Group not set"));

	const access = group.permissions.members || AccessLevel.none;
	if (access >= AccessLevel.admin) return next();

	next(new ForbiddenError("Insufficient karma"));
}

function postSend(req: Request, res: Response, next: NextFunction) {
	const { user, body } = req;
	let email: Email;
	try {
		email = emailSchema.parse(body);
	} catch (error) {
		return next(error);
	}
	sendEmail(user, email)
		.then((data) => res.json(data))
		.catch(next);
}

function get(req: Request, res: Response, next: NextFunction) {
	getTemplates(req.group!)
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let templates: EmailTemplateCreate[];
	try {
		templates = emailTemplateCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addTemplates(group, templates)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let updates: EmailTemplateUpdate[];
	try {
		updates = emailTemplateUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateTemplates(group, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let ids: number[];
	try {
		ids = emailTemplateIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteTemplates(group, ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.all("*", validatePermissions)
	.post("/send", postSend)
	.route("/templates")
	.get(get)
	.patch(updateMany)
	.post(addMany)
	.delete(removeMany);

export default router;
