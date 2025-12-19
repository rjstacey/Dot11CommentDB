import { DateTime, Duration } from "luxon";
import type { Session, Timeslot, Room } from "@/store/sessions";
import type { MeetingCreate, SyncedMeeting } from "@/store/meetings";
import type { WebexMeetingChange } from "@/store/webexMeetings";
import { webexMeetingToWebexMeetingParams } from "@/store/webexMeetings";

/* There are three edit modes:
 * add-by-slot
 * In this mode a number of slots are selected and then an entry created. The date, start time and end time/duration are determined by the slots selected.
 *
 * add-by-date
 * In this mode an entry is created. Multiple dates may be set. The start time and end time/duration are the same for all dates.
 *
 * update
 * In this mode one or more entries are updated.
 *
 * There are two types of meeting: a session meeting and a telecon meeting.
 * A session meeting has a start time and end time. The timezone is the session timezone.
 * A telecon meeting has a start time and duration. The timezone is per meeting.
 */

export type MeetingEntry = Omit<
	MeetingCreate,
	"id" | "start" | "end" | "webexMeeting"
> & {
	date: string;
	isSessionMeeting: boolean;
	startSlotId: number | null;
	startTime: string;
	endTime: string;
	duration: string;
	webexMeeting?: WebexMeetingChange;
};

export const defaultMeetingEntry: MeetingEntry = {
	date: "",
	organizationId: "",
	roomId: 0,
	isSessionMeeting: true,
	startSlotId: null,
	startTime: "00:00",
	endTime: "00:00",
	duration: "0",
	sessionId: 0,
	timezone: "America/New_York",
	hasMotions: false,
	summary: "",
	isCancelled: false,
	webexAccountId: null,
	webexMeetingId: null,
	calendarAccountId: null,
	calendarEventId: null,
	imatMeetingId: null,
	imatBreakoutId: null,
	imatGracePeriod: 10,
};

export const getIsSessionMeeting = (session: Session) =>
	session.type === "p" || session.type === "i";

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

/** Find slot with the closest startTime */
export function startSlotBestMatch(session: Session, start: DateTime) {
	return session.timeslots.reduce(
		(best, current) => {
			if (best) {
				const t_best = start.set(fromTimeStr(best.startTime));
				const t_current = start.set(fromTimeStr(current.startTime));
				if (
					Math.abs(t_best.diff(start).toMillis()) <
					Math.abs(t_current.diff(start).toMillis())
				)
					return best;
			}
			return current;
		},
		null as (typeof session.timeslots)[number] | null
	);
}

export function convertMeetingToEntry(
	meeting: SyncedMeeting,
	session: Session
): MeetingEntry {
	const { start: startIn, end: endIn, webexMeeting, ...rest } = meeting;

	const isSessionMeeting = getIsSessionMeeting(session);
	const zone = isSessionMeeting ? session.timezone : meeting.timezone;
	const start = DateTime.fromISO(startIn, { zone });
	const end = DateTime.fromISO(endIn, { zone });
	const date = start.toISODate()!;
	const startTime = start.toFormat("HH:mm");
	const endTime = end.toFormat("HH:mm");
	let startSlotId: Timeslot["id"] = 0;
	let roomId: Room["id"] | null = null;
	let duration: string = "";

	if (isSessionMeeting) {
		roomId = meeting.roomId;
		if (roomId === null || roomId === undefined) {
			const room = session.rooms.find((r) => r.name === meeting.location);
			roomId = room ? room.id : 0;
		}

		const startSlot = startSlotBestMatch(session, start);
		startSlotId = startSlot ? startSlot.id : 0;
	} else {
		duration = timeRangeToDuration(startTime, endTime);
	}

	const entry: MeetingEntry = {
		...rest,
		roomId,
		isSessionMeeting,
		date,
		startSlotId,
		startTime,
		endTime,
		timezone: zone,
		duration,
	};

	if (webexMeeting)
		entry.webexMeeting = webexMeetingToWebexMeetingParams(webexMeeting);

	return entry;
}

export function convertEntryToMeeting(
	entry: MeetingEntry,
	session: Session
): MeetingCreate {
	const { isSessionMeeting, date, startTime, ...rest } = entry;

	let zone, endTime;
	if (entry.isSessionMeeting) {
		zone = session.timezone;
		endTime = entry.endTime;
	} else {
		zone = entry.timezone;
		endTime = endTimeFromDuration(startTime, entry.duration);
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
