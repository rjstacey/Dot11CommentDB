import { z } from "zod";
import { groupIdSchema } from "./groups.js";
import { oAuthAccountSchema } from "./oauthAccounts.js";

/* Google Calendar Schema: https://developers.google.com/calendar/api/v3/reference/calendars */
export const googleCalendarSchema = z.object({
	kind: z.literal("calendar#calendar"), // Type of the resource ("calendar#calendar").
	etag: z.string(), // ETag of the resource.
	id: z.string(), // Identifier of the calendar.
	summary: z.string(), // Title of the calendar.
	description: z.string(), // Description of the calendar.
	location: z.string(), // Geographic location of the calendar as free-form text.
	timeZone: z.string(), // The time zone of the calendar. (Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich".)
});

export type GoogleCalendar = z.infer<typeof googleCalendarSchema>;

export const calendarAccountCreateSchema = z.object({
	name: z.string(),
});

export const calendarAccountChangeSchema =
	calendarAccountCreateSchema.partial();

export const calendarAccountsQuery = z
	.object({
		id: z.coerce.number(),
		name: z.string(),
		groupId: groupIdSchema,
	})
	.partial();

export const calendarAccountSchema = oAuthAccountSchema
	.omit({ authParams: true })
	.extend({
		authUrl: z.string().url(),
		displayName: z.string().optional(),
		userName: z.string().optional(),
		primaryCalendar: googleCalendarSchema.optional(),
		calendarList: z.any().array(),
		lastAccessed: z.string().datetime().nullable(),
	});
export const calendarAccountsSchema = calendarAccountSchema.array();

export type CalendarAccount = z.infer<typeof calendarAccountSchema>;
export type CalendarAccountCreate = z.infer<typeof calendarAccountCreateSchema>;
export type CalendarAccountChange = z.infer<typeof calendarAccountChangeSchema>;
export type CalendarAccountsQuery = z.infer<typeof calendarAccountsQuery>;
