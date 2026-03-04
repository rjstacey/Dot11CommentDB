import { Request, Response, NextFunction, Router } from "express";
import {
	membershipEventCreatesSchema,
	membershipEventUpdatesSchema,
	membershipEventIdsSchema,
} from "@schemas/membershipOverTime.js";
import {
	getMembershipOverTime,
	updateMembershipOverTimeEvents,
	addMembershipOverTimeEvents,
	removeMembershipOverTimeEvents,
} from "@/services/membershipOverTime.js";

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const data = await getMembershipOverTime({ groupId: group.id });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const membershipEvents = membershipEventCreatesSchema.parse(req.body);
		const data = await addMembershipOverTimeEvents(group, membershipEvents);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const updates = membershipEventUpdatesSchema.parse(req.body);
		const data = await updateMembershipOverTimeEvents(group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const ids = membershipEventIdsSchema.parse(req.body);
		const data = await removeMembershipOverTimeEvents(group, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
