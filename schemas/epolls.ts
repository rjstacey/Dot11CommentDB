import { z } from "zod";

export const epollScheam = z.object({
	id: z.number(),
	name: z.string(),
	start: z.string(),
	end: z.string(),
	topic: z.string(),
	document: z.string(),
	resultsSummary: z.string(),
});
export const epollsSchema = epollScheam.array();

export type Epoll = z.infer<typeof epollScheam>;
