import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	getTemplates,
	addTemplates,
	updateTemplates,
	deleteTemplates,
} from "../services/emailTemplates.js";
import { sendEmail, sendEmails } from "../services/emailSend.js";
import { emailSchema, emailsSchema } from "@schemas/email.js";
import {
	emailTemplateCreatesSchema,
	emailTemplateIdsSchema,
	emailTemplateUpdatesSchema,
} from "@schemas/emailTemplates.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		const { group } = req;
		if (!group) throw new Error("Group not set");
		const access = group.permissions.members || AccessLevel.none;
		const grant = access >= AccessLevel.admin;

		if (grant) return next();

		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function sendOne(req: Request, res: Response, next: NextFunction) {
	const { body } = req;
	try {
		const email = emailSchema.parse(body);
		const response = await sendEmail(email);
		res.json(response);
	} catch (error) {
		next(error);
	}
}

async function sendMany(req: Request, res: Response, next: NextFunction) {
	const { body } = req;
	try {
		const emails = emailsSchema.parse(body);
		const response = await sendEmails(emails);
		res.json(response);
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const data = await getTemplates(req.group!);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const templates = emailTemplateCreatesSchema.parse(req.body);
		const data = await addTemplates(group, templates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const updates = emailTemplateUpdatesSchema.parse(req.body);
		const data = await updateTemplates(group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const ids = emailTemplateIdsSchema.parse(req.body);
		const data = await deleteTemplates(group, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
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
