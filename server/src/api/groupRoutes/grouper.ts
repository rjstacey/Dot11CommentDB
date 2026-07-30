/*
 * Grouper API
 * (IEEE SA group web system)
 */
import { Request, Response, NextFunction, Router } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fetch, RequestInit } from "undici";
import { BadRequestError } from "@/utils/index.js";

const username = "802.11members";
const password = "Bmtycc2025!!";

function copyResponseHeaders(res: Response, headers: Headers) {
    // Skip hop-by-hop headers. Node/Express manages these on outgoing responses.
    const blocked = new Set([
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
    ]);

    for (const [name, value] of headers.entries()) {
        if (!blocked.has(name.toLowerCase())) res.setHeader(name, value);
    }
}

async function getFile(req: Request, res: Response, next: NextFunction) {
    try {
        const group = req.group!;
        const [c, wg] = group.name.split(".");
        if (!c || !wg) throw new BadRequestError("Invalid group");
        const path = req.query.path as string | undefined;
        if (!path) throw new BadRequestError("Missing query parameter: path");
        const options: RequestInit = { method: "GET" };
        if (path.includes('private/')) {
            const token = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
            options.headers = {
                "Authorization": `Basic ${token}`
            };
        }

        const url = `https://grouper.ieee.org/groups/${c}/${wg}/${path}`;
        console.log(options)
        const upstream = await fetch(url, options);

        res.status(upstream.status);
        copyResponseHeaders(res, upstream.headers);

        if (!upstream.body) {
            res.end();
            return;
        }

        await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (error) {
        next(error);
    }
}

const router = Router();
router
    .get("/", getFile);

export default router;