import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getTemplates,
	addTemplates,
	updateTemplates,
	deleteTemplates,
} from "../services/emailTemplates";
import { sendEmail, sendEmails } from "../services/emailSend";
import { emailSchema, emailsSchema } from "@schemas/email";
import {
	EmailTemplateCreate,
	EmailTemplateUpdate,
	emailTemplateCreatesSchema,
	emailTemplateIdsSchema,
	emailTemplateUpdatesSchema,
} from "@schemas/emailTemplates";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const { group, user } = req;
	if (!group) return next(new Error("Group not set"));

	const access = group.permissions.members || AccessLevel.none;
	if (access >= AccessLevel.admin) return next();

	next(new ForbiddenError("Insufficient karma"));
}

async function sendOne(req: Request, res: Response, next: NextFunction) {
	const { user, body } = req;
	try {
		const email = emailSchema.parse(body);
		const response = sendEmail(user, email);
		res.json(response);
	} catch (error) {
		next(error);
	}
}

async function sendMany(req: Request, res: Response, next: NextFunction) {
	const { user, body } = req;
	try {
		const emails = emailsSchema.parse(body);
		const response = sendEmails(user, emails);
		res.json(response);
	} catch (error) {
		next(error);
	}
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
	.post("/send", sendOne)
	.post("/sendMany", sendMany)
	.route("/templates")
	.get(get)
	.patch(updateMany)
	.post(addMany)
	.delete(removeMany);

export default router;
