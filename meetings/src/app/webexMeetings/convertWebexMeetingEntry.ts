import { DateTime } from "luxon";
import type { Multiple } from "dot11-components";
import {
	defaultWebexMeetingParams,
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexMeetingChange,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";

export const defaultWebexMeeting: WebexMeetingEntry = {
	...defaultWebexMeetingParams,
	accountId: null,
	title: "",
	timezone: "",
	date: "",
	startTime: "",
	endTime: "02:00",
	//templateId: null,
};

export type WebexMeetingEntry = Omit<
	WebexMeetingChange,
	"accountId" | "id" | "start" | "end"
> & {
	accountId: number | null;
	date: string;
	startTime: string;
	endTime: string;
	meetingId?: number;
};

export type PartialWebexMeetingEntry = Partial<
	Omit<WebexMeetingEntry, "meetingOptions" | "audioConnectionOptions">
> & {
	meetingOptions?: Partial<WebexMeetingOptions>;
	audioConnectionOptions?: Partial<WebexAudioConnectionOptions>;
};

export type MultipleWebexMeetingEntry = Multiple<
	Omit<WebexMeetingEntry, "meetingOptions" | "audioConnectionOptions">
> & {
	meetingOptions: Multiple<WebexMeetingOptions>;
	audioConnectionOptions: Multiple<WebexAudioConnectionOptions>;
};

export function convertWebexMeetingToEntry(
	webexMeeting: SyncedWebexMeeting
): WebexMeetingEntry {
	const { start, end, ...rest } = webexMeeting;

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
		date,
		startTime,
		endTime,
	};
}

export function convertEntryToWebexMeeting(
	entry: WebexMeetingEntry
): Omit<WebexMeetingChange, "id"> {
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
