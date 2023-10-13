/*
 * Supply a list of permission options
 *
 * GET /
 *      Returns an array of objects with shape {scope, desciption} that is the complete set of permission options.
 */
import { Router } from "express";
import { permissions } from "../services/users";

const router = Router();

router.get("/", async (req, res, next) => res.json(permissions));

export default router;
