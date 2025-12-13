import { DateTime } from "luxon";
import type {
	WebexMeeting,
	WebexMeetingCreate,
	WebexMeetingChange,
} from "@/store/webexMeetings";

type ToEntry<T> = Omit<T, "accountId" | "start" | "end"> & {
	accountId: number | null;
	date: string;
	startTime: string;
	endTime: string;
	meetingId?: number;
};

type FromEntry<T> = Omit<T, "accountId" | "date" | "startTime" | "endTime"> & {
	accountId: number;
	start: string;
	end: string;
};

export type WebexMeetingEntry = ToEntry<WebexMeetingChange>;
export type WebexMeetingEntryCreate = ToEntry<WebexMeetingCreate>;

export function convertWebexMeetingToEntry<
	T extends WebexMeetingCreate | WebexMeeting,
>(webexMeeting: T): ToEntry<T> {
	const { start, end, accountId, ...rest } = webexMeeting;

	const zone = webexMeeting.timezone;
	const startDT = DateTime.fromISO(start, { zone });
	const endDT = DateTime.fromISO(end, { zone });
	const date = startDT.toISODate()!;
	const startTime = startDT.toFormat("HH:mm");
	const endTime = endDT.toFormat("HH:mm");

	if (endDT.diff(startDT, "days").days > 1)
		console.warn("Duration greater than one day");

	return {
		...rest,
		accountId,
		date,
		startTime,
		endTime,
	};
}

export function convertEntryToWebexMeeting<
	T extends WebexMeetingEntryCreate | WebexMeetingEntry,
>(entry: T): FromEntry<T> {
	const { date, startTime, endTime, accountId, ...rest } = entry;
	const webexMeeting = { ...rest };

	const zone = webexMeeting.timezone;
	const startDT = DateTime.fromFormat(
		`${date} ${startTime}`,
		"yyyy-MM-dd HH:mm",
		{ zone }
	);
	let endDT = DateTime.fromFormat(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", {
		zone,
	});
	if (endDT.toMillis() < startDT.toMillis()) endDT = endDT.plus({ days: 1 });
	const start = startDT.toISO()!;
	const end = endDT.toISO()!;

	return {
		...rest,
		accountId: accountId!, // Checks ensure that accountId is not null
		start,
		end,
	};
}
