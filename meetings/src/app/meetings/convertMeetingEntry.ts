import { DateTime, Duration } from "luxon";
import type { Multiple } from "@common";
import type { Session, Timeslot, Room } from "@/store/sessions";
import type { MeetingCreate, SyncedMeeting } from "@/store/meetings";
import type { WebexMeetingChange } from "@/store/webexMeetings";
import { webexMeetingToWebexMeetingParams } from "@/store/webexMeetings";
import type {
	MultipleWebexMeetingEntry,
	PartialWebexMeetingEntry,
} from "@/edit/convertWebexMeetingEntry";

export type MeetingEntry = Omit<
	MeetingCreate,
	"id" | "start" | "end" | "webexMeeting"
> & {
	date: string;
	startTime: string;
	endTime: string;
	startSlotId: number | null;
	duration: string;
	webexMeeting?: WebexMeetingChange;
};

export type PartialMeetingEntry = Partial<
	Omit<MeetingEntry, "webexMeeting"> & {
		webexMeeting: PartialWebexMeetingEntry;
	}
>;

export type MultipleMeetingEntry = Multiple<
	Omit<MeetingEntry, "webexMeeting">
> & {
	dates: string[];
	slots: (string | null)[];
	webexMeeting?: MultipleWebexMeetingEntry;
};

export const isSessionMeeting = (session: Session | undefined) =>
	session && (session.type === "p" || session.type === "i");

//const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str: string) => {
	const m = str.match(/(\d+):(\d+)/);
	return m
		? { hour: Number(m[1]), minute: Number(m[2]) }
		: { hour: 0, minute: 0 };
};

function timeRangeToDuration(startTime: string, endTime: string) {
	let d = DateTime.fromFormat(endTime, "HH:mm")
		.diff(DateTime.fromFormat(startTime, "HH:mm"))
		.shiftTo("hours", "minutes");
	if (d.hours < 0) d = d.plus({ hours: 24 });
	return d.toFormat(d.minutes ? "h:mm" : "h");
}

function endTimeFromDuration(startTime: string, duration: string) {
	const d = duration.trim();
	const m = /^(\d*):(\d{2})$/.exec(d);
	const dt = Duration.fromObject(
		m
			? { hours: m[1] ? Number(m[1]) : 0, minutes: Number(m[2]) }
			: { hours: Number(d) }
	);
	return DateTime.fromFormat(startTime, "HH:mm").plus(dt).toFormat("HH:mm");
}

export function convertMeetingToEntry(
	meeting: SyncedMeeting,
	session?: Session
): MeetingEntry {
	const { start: startIn, end: endIn, webexMeeting, ...rest } = meeting;

	const zone =
		session && isSessionMeeting(session)
			? session.timezone
			: meeting.timezone;
	const start = DateTime.fromISO(startIn, { zone });
	const end = DateTime.fromISO(endIn, { zone });
	const date = start.toISODate()!;
	const startTime = start.toFormat("HH:mm");
	const endTime = end.toFormat("HH:mm");
	let startSlotId: Timeslot["id"] = 0;
	let roomId: Room["id"] | null = null;
	let duration: string = "";

	if (isSessionMeeting(session)) {
		roomId = meeting.roomId;
		if (roomId === null || roomId === undefined) {
			const room = session!.rooms.find(
				(r) => r.name === meeting.location
			);
			roomId = room ? room.id : 0;
		}

		let startSlot = session!.timeslots.find((s) => {
			const slotStart = start.set(fromTimeStr(s.startTime));
			const slotEnd = start.set(fromTimeStr(s.endTime));
			return start >= slotStart && start < slotEnd;
		});
		if (!startSlot) {
			// If we can't find a slot that includes the startTime then find best match
			startSlot = session!.timeslots.find((s) => {
				const slotStart = start.set(fromTimeStr(s.startTime));
				return start >= slotStart;
			});
		}
		startSlotId = startSlot ? startSlot.id : 0;
	} else {
		duration = timeRangeToDuration(startTime, endTime);
	}

	const entry: MeetingEntry = {
		...rest,
		date,
		startTime,
		endTime,
		startSlotId,
		roomId,
		duration,
	};

	if (webexMeeting)
		entry.webexMeeting = webexMeetingToWebexMeetingParams(webexMeeting);

	return entry;
}

export function convertEntryToMeeting(
	entry: MeetingEntry,
	session?: Session
): MeetingCreate {
	const {
		date,
		startTime,
		endTime: endTimeIn,
		startSlotId,
		duration,
		...rest
	} = entry;
	let endTime = endTimeIn;

	let zone;
	if (isSessionMeeting(session)) {
		zone = session!.timezone;
	} else {
		zone = entry.timezone;
		endTime = endTimeFromDuration(startTime, duration);
	}
	const start = DateTime.fromISO(date, { zone }).set(fromTimeStr(startTime));
	let end = DateTime.fromISO(date, { zone }).set(fromTimeStr(endTime));
	if (end < start) end = end.plus({ days: 1 });

	return {
		...rest,
		timezone: zone,
		start: start.toISO()!,
		end: end.toISO()!,
	};
}
