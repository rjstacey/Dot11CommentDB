import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import { AuthError, NotFoundError } from "../utils/index.js";

import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import type { User } from "./users.js";

import { getSession } from "./sessions.js";
import type { Session } from "@schemas/sessions.js";

import { getGroupAndSubgroupIds, getWorkingGroup } from "./groups.js";
import type { Group } from "@schemas/groups.js";

import { getOAuthAccounts } from "./oauthAccounts.js";
import {
	getWebexMeetings,
	getWebexMeeting,
	addWebexMeeting,
	updateWebexMeeting,
	deleteWebexMeeting,
} from "./webex.js";
import {
	WebexMeeting,
	WebexMeetingCreate,
	WebexMeetingChange,
} from "@schemas/webex.js";

import {
	deleteImatBreakouts,
	addImatBreakoutFromMeeting,
	updateImatBreakoutFromMeeting,
} from "./imat.js";
import type { Breakout } from "@schemas/imat.js";

import {
	addCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent,
	CalendarEvent,
} from "./calendar.js";

import type {
	Meeting,
	MeetingsQuery,
	MeetingCreate,
	MeetingUpdate,
	MeetingChange,
	MeetingsGetResponse,
	MeetingsUpdateResponse,
} from "@schemas/meetings.js";

function selectMeetingsSql(constraints: MeetingsQuery) {
	// prettier-ignore
	let sql =
		"SELECT " +
			"m.id as id, " +
			"BIN_TO_UUID(organizationId) AS organizationId, " +
			"summary, " +
			'DATE_FORMAT(start, "%Y-%m-%dT%TZ") AS start, ' +
			'DATE_FORMAT(end, "%Y-%m-%dT%TZ") AS end, ' +
			"timezone, " +
			"location, " +
			"isCancelled, hasMotions, " +
			"webexAccountId, webexMeetingId, " +
			"calendarAccountId, calendarEventId, " +
			"imatMeetingId, imatBreakoutId, " +
			"m.sessionId, " +
			"m.roomId, " +
			"r.name as roomName " +
		"FROM meetings m " +
		"LEFT JOIN rooms r ON r.id=m.roomId AND r.sessionId=m.sessionId";

	const { groupId, sessionId, fromDate, toDate, timezone, ...rest } =
		constraints;
	//console.log(rest)

	let wheres: string[] = [];
	if (groupId) {
		sql += " LEFT JOIN organization o ON o.id=m.organizationId";
		wheres.push(
			db.format("(o.parent_id=UUID_TO_BIN(?) OR o.id=UUID_TO_BIN(?))", [
				groupId,
				groupId,
			])
		);
	}

	if (sessionId) {
		wheres.push(db.format("m.sessionId=?", [sessionId]));
	} else if (Object.keys(rest).length === 0 && !fromDate) {
		/* Without other constraints, default fromDate is now */
		const date = DateTime.now().toUTC();
		wheres.push(db.format("end > ?", date.toFormat("yyyy-MM-dd HH:mm:ss")));
	}

	if (fromDate) {
		const zone = timezone || "America/New_York";
		const date = DateTime.fromISO(fromDate, { zone }).toUTC();
		wheres.push(db.format("end > ?", date.toFormat("yyyy-MM-dd HH:mm:ss")));
	}

	if (toDate) {
		const zone = timezone || "America/New_York";
		const date = DateTime.fromISO(toDate, { zone })
			.plus({ days: 1 })
			.toUTC();
		wheres.push(
			db.format("start <= ?", date.toFormat("yyyy-MM-dd HH:mm:ss"))
		);
	}

	if (Object.entries(rest).length) {
		wheres = wheres.concat(
			Object.entries(rest).map(([key, value]) =>
				key === "organizationId"
					? db.format(
							Array.isArray(value)
								? "BIN_TO_UUID(m.??) IN (?)"
								: "m.??=UUID_TO_BIN(?)",
							[key, value]
					  )
					: db.format(
							Array.isArray(value) ? "m.?? IN (?)" : "m.??=?",
							[key, value]
					  )
			)
		);
	}

	if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
	//console.log(sql);
	return sql;
}

/*
 * Get meetings.
 *
 * @constraints:object One or more constraints.
 *
 * Returns an array of meeting objects that meet the constraints.
 */
async function selectMeetings(constraints: MeetingsQuery) {
	if (constraints.groupId && !constraints.organizationId) {
		const organizationId = await getGroupAndSubgroupIds(
			constraints.groupId
		);
		constraints = { ...constraints, organizationId };
		delete constraints.groupId;
	}
	const sql = selectMeetingsSql(constraints);
	return db.query({ sql, dateStrings: true }) as Promise<Meeting[]>;
}

/*
 * Get a list of meetings and Webex meetings.
 *
 * @constraints?:object 	One or more constraints.
 *
 * Returns an object with shape {meetings, webexMeetings} where @meetings is array of meetings that meet the
 * constraints and @webexMeetings is an array of Webex meetings referenced by the meetings.
 */
export async function getMeetings(
	user: User,
	constraints: MeetingsQuery
): Promise<MeetingsGetResponse> {
	const meetings = await selectMeetings(constraints);
	const ids = meetings.reduce(
		(ids, m) => (m.webexMeetingId ? ids.concat([m.webexMeetingId]) : ids),
		[] as string[]
	);
	let webexMeetings: WebexMeeting[] = [];
	if (ids.length > 0) {
		try {
			webexMeetings = await getWebexMeetings({ ...constraints, ids });
		} catch (error) {
			console.log(error);
		}
	}
	// Normalize webexMeetings
	const webexMeetingEntities: Record<string, WebexMeeting> = {};
	webexMeetings.forEach(
		(webexMeeting) => (webexMeetingEntities[webexMeeting.id] = webexMeeting)
	);
	// Make sure the webexAccountId matches. It is possible that a new account has been created.
	const updates: MeetingUpdate[] = [];
	for (const meeting of meetings) {
		if (meeting.webexMeetingId) {
			const webexMeeting = webexMeetingEntities[meeting.webexMeetingId];
			if (
				webexMeeting &&
				meeting.webexAccountId !== webexMeeting.accountId
			) {
				meeting.webexAccountId = webexMeeting.accountId;
				updates.push({
					id: meeting.id,
					changes: { webexAccountId: meeting.webexAccountId },
				});
			}
		}
	}
	//await Promise.all(updates.map((u) => updateMeetingDB(u.id, u.changes)));

	return { meetings, webexMeetings };
}

/*
 * Convert a meeting change object to SET SQL for a table UPDATE or INSERT.
 *
 * @e:object 	The meeting change object.
 *
 * Returns an escaped SQL SET string, e.g., '`hasMotions`=1, `location`="Bar"'
 */
function meetingToSetSql(e: MeetingChange) {
	const entry: Record<string, any> = {
		organizationId: e.organizationId,
		summary: e.summary,
		location: e.location,
		roomId: e.roomId,
		sessionId: e.sessionId,
		isCancelled: e.isCancelled,
		hasMotions: e.hasMotions,
		webexAccountId: e.webexAccountId,
		webexMeetingId: e.webexMeetingId,
		calendarAccountId: e.calendarAccountId,
		calendarEventId: e.calendarEventId,
		imatMeetingId: e.imatMeetingId,
		imatBreakoutId: e.imatBreakoutId,
	};

	if (typeof e.timezone !== "undefined") {
		if (!DateTime.local().setZone(e.timezone).isValid)
			throw new TypeError("Invalid parameter timezone: " + e.timezone);
		entry.timezone = e.timezone;
	}

	if (typeof e.start !== "undefined") {
		const start = DateTime.fromISO(e.start);
		if (!start.isValid)
			throw new TypeError("Invlid parameter start: " + e.start);
		entry.start = start.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
	}

	if (typeof e.end !== "undefined") {
		const end = DateTime.fromISO(e.end);
		if (!end.isValid) throw new TypeError("Invlid parameter end: " + e.end);
		entry.end = end.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
	}

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	const sets: string[] = [];
	for (const [key, value] of Object.entries(entry)) {
		let sql: string;
		if (key === "organizationId")
			sql = db.format("??=UUID_TO_BIN(?)", [key, value]);
		else sql = db.format("??=?", [key, value]);
		sets.push(sql);
	}

	return sets.join(", ");
}

/**
 * Create a Webex meeting event for a meeting.
 *
 * @param meeting Meeting object.
 * @returns The Webex meeting event object.
 */
function meetingToWebexMeeting(meeting: MeetingCreate) {
	const timezone = meeting.timezone || "America/New_York";
	const webexMeeting: WebexMeetingCreate & WebexMeetingChange = {
		accountId: meeting.webexAccountId!,
		password: "wireless",
		enabledAutoRecordMeeting: false,
		...meeting.webexMeeting,
		title: meeting.summary,
		start: DateTime.fromISO(meeting.start, { zone: timezone }).toISO(),
		end: DateTime.fromISO(meeting.end, { zone: timezone }).toISO(),
		timezone,
		integrationTags: [meeting.organizationId],
		id: meeting.webexMeetingId || "",
	};
	//console.log('to webex meeting', meeting, webexMeeting)
	return webexMeeting;
}

function webexMeetingUpdateNeeded(
	webexMeeting: WebexMeeting,
	webexMeetingChanges: Partial<WebexMeeting>
): boolean {
	/* Don't update if the meeting has already started */
	const start = DateTime.fromISO(
		webexMeetingChanges.start || webexMeeting.start
	);
	if (start < DateTime.now()) return false;

	for (const key of Object.keys(webexMeetingChanges)) {
		if (key === "accountId") {
			/* ignore */
		} else if (key === "start" || key === "end") {
			if (
				!DateTime.fromISO(webexMeeting[key]).equals(
					DateTime.fromISO(webexMeetingChanges[key]!)
				)
			) {
				console.log(
					`Mismatch for ${key}: `,
					webexMeeting[key],
					webexMeetingChanges[key]
				);
				return true;
			}
		} else if (!isEqual(webexMeeting[key], webexMeetingChanges[key])) {
			console.log(
				`Mismatch for ${key}: `,
				webexMeeting[key],
				webexMeetingChanges[key]
			);
			return true;
		}
	}
	return false;
}

/**
 * Format Webex meeting number (e.g., 1234 567 8901)
 */
const formatMeetingNumber = (n: string) =>
	n.slice(0, 4) + " " + n.slice(4, 7) + " " + n.slice(7);

/**
 * Create IMAT breakout location string for a webex meeting.
 *
 * @param webexAccountId Webex account identifier.
 * @param webexMeeting Webex meeting object.
 * @returns A string that is the IMAT breakout location.
 */
export async function webexMeetingImatLocation(
	webexAccountId: number,
	webexMeeting: WebexMeeting
) {
	let location = "";
	const [oauthAccount] = await getOAuthAccounts({ id: webexAccountId });
	if (oauthAccount) location = oauthAccount.name + ": ";
	location += formatMeetingNumber(webexMeeting.meetingNumber);
	return location;
}

const meetingDescriptionStyle = `
	<style>
		* {
			font-family: arial;
			font-size: 16px;
			color: #666666;
		}
		p {
			margin: 20px;
		}
		a {
			color: #049FD9;
			text-decoration: none;
		}
		.intro {
			font-size: 18px;
		}
	</style>`;

/**
 * Create a calendar event description for a meeting.
 * (works for google calendar but not outlook)
 *
 * @param meeting The meeting for which the calendar event description is being created.
 * @param webexMeeting (optional) Webex meeting event object
 * @returns A string that is the calendar event description.
 */
function meetingToCalendarDescriptionHtml(
	meeting: Meeting,
	webexMeeting: WebexMeeting
) {
	let description = meetingDescriptionStyle;

	if (meeting.hasMotions) description += "<p>Agenda includes motions</p>";

	if (
		webexMeeting &&
		"meetingNumber" in webexMeeting &&
		"webLink" in webexMeeting
	) {
		const { meetingNumber, webLink, password, telephony } = webexMeeting;

		description += `
			<p>
				Meeting link:<br>
				<a href="${webLink}">${webLink}</a>
			</p>
			<p>
				Meeting number:<br>
				${formatMeetingNumber(meetingNumber)}
			</p>
			<p>
				Meeting password:<br>
				${password}
			</p>
		`;

		if (telephony && Array.isArray(telephony.callInNumbers)) {
			description += `
				<p>
					Join by phone:<br>
					${telephony.callInNumbers
						.map((c) => c.callInNumber + " " + c.label)
						.join("<br>")}
				</p>
			`;
		}

		description +=
			'<p>Need help? Go to <a href="http://help.webex.com">http://help.webex.com</a></p>';
	}

	return description.replace(/\t|\n/g, ""); // strip tabs and newline (helps with google calendar formating)
}

/**
 * Create a calendar event description for a meeting.
 *
 * @param meeting The meeting for which the calendar event description is being created.
 * @param webexMeeting (optional) Webex meeting event object
 * @param breakout (optional) IMAT breakout object
 * @returns A string that is the calendar event description.
 */
function meetingToCalendarDescriptionText(
	meeting: MeetingCreate,
	webexMeeting: WebexMeeting | undefined,
	breakout: Breakout | undefined
) {
	let description = "";

	if (meeting.hasMotions) description += "Agenda includes motions\n\n";

	if (
		webexMeeting &&
		"meetingNumber" in webexMeeting &&
		"webLink" in webexMeeting
	) {
		description += `
			Meeting link:
			${webexMeeting.webLink}

			Meeting number: ${formatMeetingNumber(webexMeeting.meetingNumber)}

			Meeting password: ${webexMeeting.password}\n
		`;

		const { telephony } = webexMeeting;
		if (telephony && Array.isArray(telephony.callInNumbers)) {
			description += `
				Join by phone:
				${telephony.callInNumbers.map((c) => c.callInNumber + " " + c.label).join("\n")}
			`;
		}

		description += "Need help? Go to https://help.webex.com\n";
	}

	return description.replace(/\t/g, ""); // strip tabs
}

/**
 * Create a calendar event for meeting.
 *
 * @param meeting The meeting for which the calendar event is being created.
 * @param session (Optional) The session for which the calendar event is being created.
 * @param webexMeeting (Optional) The Webex meeting for which the calendar event is being created.
 * @param breakout (Optional) The IMAT breakout associated with the meeting
 * @returns The calendar event object.
 */
function meetingToCalendarEvent(
	meeting: MeetingCreate,
	session: Session | undefined,
	workingGroup: Group | undefined,
	webexMeeting: WebexMeeting | undefined,
	breakout: Breakout | undefined
) {
	let location = meeting.location || "";

	if (session && Array.isArray(session.rooms)) {
		const room = session.rooms.find((room) => room.id === meeting.roomId);
		if (room) location = room.name;
	}

	if (!location && webexMeeting) location = webexMeeting.webLink || "";

	let description = meetingToCalendarDescriptionText(
		meeting,
		webexMeeting,
		breakout
	);

	let summary = meeting.summary.replace(/^802.11/, "").trim();
	if (workingGroup) summary = workingGroup.name + " " + summary;

	summary = summary.replace(/[*]$/, ""); // Remove trailing asterisk
	if (meeting.hasMotions) summary += "*"; // Add trailing asterisk

	if (meeting.isCancelled) summary = "CANCELLED - " + summary;

	return {
		summary,
		location,
		description,
		start: {
			dateTime: meeting.start,
			timeZone: meeting.timezone,
		},
		end: {
			dateTime: meeting.end,
			timeZone: meeting.timezone,
		},
	};
}

/**
 * Add a meeting, including adding webex, calendar and imat entries (if needed).
 *
 * @param user The user executing the add
 * @param meetingToAdd The meeting object to be added
 * @returns An object that includes the meeting as added, the Webex meeting event (if created) and IMAT breakout (if created).
 */
async function addMeeting(user: User, meetingToAdd: MeetingCreate) {
	let webexMeeting: WebexMeeting | undefined,
		breakout: Breakout | undefined,
		session: Promise<Session | undefined> | Session | undefined,
		workingGroup: Promise<Group | undefined> | Group | undefined;

	//console.log(meetingToAdd);

	let meeting: Omit<Meeting, "id"> = {
		...meetingToAdd,
		webexMeetingId: null,
		imatBreakoutId: null,
	};

	if (meetingToAdd.sessionId) session = getSession(meetingToAdd.sessionId); // returns a promise

	if (meetingToAdd.organizationId)
		workingGroup = getWorkingGroup(user, meetingToAdd.organizationId); // returns a promise

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (meetingToAdd.webexAccountId && meetingToAdd.webexMeetingId) {
		const webexMeetingParams = meetingToWebexMeeting(meeting);
		if (meetingToAdd.webexMeetingId === "$add") {
			webexMeeting = await addWebexMeeting(webexMeetingParams);
			meeting.webexMeetingId = webexMeeting.id;
		} else {
			// Meeting created with a link to existing webex meeting
			webexMeeting = await updateWebexMeeting(webexMeetingParams);
		}
	}

	session = await session!; // do webex update while we wait for session

	/* If meetingId is given then add a breakout for this meeting */
	if (meetingToAdd.imatMeetingId) {
		if (meetingToAdd.imatBreakoutId === "$add") {
			breakout = await addImatBreakoutFromMeeting(
				user,
				session,
				meeting,
				webexMeeting
			);
			meeting.imatBreakoutId = breakout.id!;
		} else {
			breakout = await updateImatBreakoutFromMeeting(
				user,
				session,
				meeting,
				webexMeeting
			);
		}
	}

	/* If a calendar account is given, then add calendar event for this meeting */
	if (meetingToAdd.calendarAccountId) {
		workingGroup = await workingGroup; // only need group with calendar update
		let calendarEvent: CalendarEvent | void = meetingToCalendarEvent(
			meeting,
			session,
			workingGroup,
			webexMeeting,
			breakout
		);
		if (!meetingToAdd.calendarEventId) {
			try {
				calendarEvent = await addCalendarEvent(
					meetingToAdd.calendarAccountId,
					calendarEvent
				);
				meeting.calendarEventId = calendarEvent?.id || null;
			} catch (error) {
				meeting.calendarEventId = null;
			}
		} else {
			await updateCalendarEvent(
				meetingToAdd.calendarAccountId,
				meetingToAdd.calendarEventId,
				calendarEvent
			);
		}
	}

	const sql = "INSERT INTO meetings SET " + meetingToSetSql(meeting);
	const { insertId } = (await db.query({
		sql,
		dateStrings: true,
	})) as ResultSetHeader;
	const [meetingOut] = await selectMeetings({ id: insertId });

	return { meeting: meetingOut, webexMeeting, breakout };
}

/**
 * Add meetings, including webex, calendar and imat entries.
 *
 * @param user The user executing the add
 * @param meetings An array of meeting objects to be added
 * @returns An object that contains an array of meeting objects as added, an array of webex meetings and an array of IMAT breakouts.
 */
export async function addMeetings(user: User, meetingsIn: MeetingCreate[]) {
	if (!user.ieeeClient) throw new AuthError("Not logged in");

	const entries = await Promise.all(
		meetingsIn.map((m) => addMeeting(user, m))
	);

	const meetings: Meeting[] = [],
		webexMeetings: WebexMeeting[] = [],
		breakouts: Breakout[] = [];

	entries.forEach((entry) => {
		meetings.push(entry.meeting);
		if (entry.webexMeeting) webexMeetings.push(entry.webexMeeting);
		if (entry.breakout) breakouts.push(entry.breakout);
	});

	return { meetings, webexMeetings, breakouts };
}

/**
 * Make Webex changes for a meeting update.
 *
 * If a Webex meeting was previously created (current entry has webexAccountId and webexMeetingId):
 *   Remove existing Webex meeting if webexMeetingId is changed to null.
 *   Remove existing Webex meeting and add a new webex meeting if webexMeetingId is changed to '$add'.
 *   Otherwise, update the existing meeting
 * If a Webex meeting has not yet been created (current entry is missing webexAccountId and/or webexMeetingId):
 *   Add Webex meeting if webexMeetingId is '$add'
 */
async function meetingMakeWebexUpdates(
	meeting: Meeting,
	changes: MeetingChange
) {
	let webexMeeting: WebexMeeting | undefined;

	const webexAccountId = changes.webexAccountId || meeting.webexAccountId;
	if (!webexAccountId) return webexMeeting;

	let webexMeetingParams = meetingToWebexMeeting({
		...meeting,
		...changes,
		webexMeetingId: null,
		imatBreakoutId: null,
	});

	if (meeting.webexAccountId && meeting.webexMeetingId) {
		// Webex meeting previously created

		// Get parameters for existing meeting
		try {
			webexMeeting = await getWebexMeeting(
				meeting.webexAccountId,
				meeting.webexMeetingId,
				meeting.timezone
			);
			webexMeetingParams = { ...webexMeeting, ...webexMeetingParams };
		} catch (error) {
			if (!(error instanceof NotFoundError)) throw error;
			// meeting not found
		}

		if (
			("webexAccountId" in changes &&
				changes.webexAccountId !== meeting.webexAccountId) ||
			("webexMeetingId" in changes &&
				changes.webexMeetingId !== meeting.webexMeetingId)
		) {
			// Webex account or webex meeting ID changed

			// Delete exisiting webex meeting
			try {
				await deleteWebexMeeting({
					accountId: meeting.webexAccountId,
					id: meeting.webexMeetingId,
				});
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
				// Ignore meeting not found error (probably deleted through other means)
			}
			webexMeeting = undefined;

			if (webexAccountId && changes.webexMeetingId === "$add") {
				// Changes indicate that a new webex meeting should be added
				webexMeeting = await addWebexMeeting(webexMeetingParams);
				changes.webexMeetingId = webexMeeting.id;
			} else {
				changes.webexMeetingId = null;
			}
		} else {
			// Update existing webex meeting
			webexMeetingParams.id = meeting.webexMeetingId;
			if (
				!webexMeeting ||
				webexMeetingUpdateNeeded(webexMeeting, webexMeetingParams)
			) {
				try {
					webexMeeting = await updateWebexMeeting(webexMeetingParams);
				} catch (error) {
					if (!(error instanceof NotFoundError)) throw error;
					// meeting not found
					changes.webexMeetingId = null;
				}
			}
		}
	} else {
		if (webexAccountId && changes.webexMeetingId) {
			if (changes.webexMeetingId === "$add") {
				// Add new meeting
				webexMeeting = await addWebexMeeting(webexMeetingParams);
				changes.webexMeetingId = webexMeeting.id;
			} else {
				// Link to existing webex meeting
				try {
					webexMeeting = await getWebexMeeting(
						webexAccountId,
						changes.webexMeetingId,
						meeting.timezone
					);
					webexMeetingParams = {
						...webexMeeting,
						...webexMeetingParams,
						accountId: webexAccountId,
						id: changes.webexMeetingId,
					};
					if (
						webexMeetingUpdateNeeded(
							webexMeeting,
							webexMeetingParams
						)
					) {
						webexMeeting = await updateWebexMeeting(
							webexMeetingParams
						);
					}
				} catch (error) {
					if (!(error instanceof NotFoundError)) throw error;
					// meeting not found
					changes.webexMeetingId = null;
				}
			}
		}
	}

	return webexMeeting;
}

/**
 * Make IMAT breakout changes for a meeting update.
 *
 * If IMAT breakout was previously created (current entry has imatMeetingId and imatBreakoutId):
 *   If the imatMeetingId or imatBreakoutId is changed:
 *     Remove existing IMAT breakout if imatBreakoutId is set to null.
 *     Remove existing IMAT breakout and add a new IMAT breakout if imatBreakoutId === '$add'.
 *     Remove existing IMAT breakout and update specified IMAT breakout if imatBreakoutId is not null and not '$add'
 *       (the user is linking a meeting entry to an existing IMAT breakout entry)
 *   If the imatMeetingId and imatBreakoutId remain unchanged:
 *     Update existing IMAT breakout
 * If IMAT breakout has not yet been created (current entry is missing imatMeetingId and/or imatBreakoutId):
 *   Add IMAT breakout if imatBreakoutId is '$add'
 *   Update specified IMAT breakout if imatBreakoutId is not '$add'
 *      (the user is linking a meeting entry to an existing IMAT breakout entry)
 */
async function meetingMakeImatBreakoutUpdates(
	user: User,
	meeting: Meeting,
	changes: MeetingChange,
	session: Session | undefined,
	webexMeeting: WebexMeeting | undefined
) {
	let breakout: Breakout | undefined;

	const { webexMeetingId, imatBreakoutId, ...meetingChanges } = changes;
	const updatedMeeting: Meeting = { ...meeting, ...meetingChanges };

	if (meeting.imatMeetingId && meeting.imatBreakoutId) {
		// IMAT breakout previously created
		if (
			("imatMeetingId" in changes &&
				changes.imatMeetingId !== meeting.imatMeetingId) ||
			("imatBreakoutId" in changes &&
				changes.imatBreakoutId !== meeting.imatBreakoutId)
		) {
			// Delete existing breakout if the breakout meeting or breakout ID changes
			try {
				await deleteImatBreakouts(user, meeting.imatMeetingId, [
					meeting.imatBreakoutId,
				]);
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
			}
			if (changes.imatBreakoutId === "$add") {
				// Different session
				breakout = await addImatBreakoutFromMeeting(
					user,
					session,
					updatedMeeting,
					webexMeeting
				);
				//changes.imatBreakoutId = breakout.id;
			} else if (changes.imatBreakoutId) {
				// User is linking meeting to an existing IMAT breakout
				updatedMeeting.imatBreakoutId = changes.imatBreakoutId;
				breakout = await updateImatBreakoutFromMeeting(
					user,
					session,
					updatedMeeting,
					webexMeeting
				);
			}
		} else {
			// Update previously created breakout
			console.log("update breakout");
			try {
				breakout = await updateImatBreakoutFromMeeting(
					user,
					session,
					updatedMeeting,
					webexMeeting
				);
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
				// IMAT breakout no longer exists
				//changes.imatBreakoutId = null;
			}
		}
	} else {
		// IMAT breakout not prevoiusly created
		if (changes.imatBreakoutId === "$add") {
			breakout = await addImatBreakoutFromMeeting(
				user,
				session,
				updatedMeeting,
				webexMeeting
			);
			//changes.imatBreakoutId = breakout.id;
		} else if (changes.imatBreakoutId) {
			updatedMeeting.imatBreakoutId = changes.imatBreakoutId;
			breakout = await updateImatBreakoutFromMeeting(
				user,
				session,
				updatedMeeting,
				webexMeeting
			);
		}
	}

	return breakout;
}

async function meetingMakeCalendarUpdates(
	meeting: Meeting,
	changes: MeetingChange,
	session: Session | undefined,
	workingGroup: Group | undefined,
	webexMeeting: WebexMeeting | undefined,
	breakout: Breakout | undefined
) {
	let calendarEvent: CalendarEvent | void = undefined;

	let updatedMeeting = { ...meeting, ...changes };

	const calendarEventParams: CalendarEvent = meetingToCalendarEvent(
		updatedMeeting,
		session,
		workingGroup,
		webexMeeting,
		breakout
	);

	if (meeting.calendarAccountId && meeting.calendarEventId) {
		// Calendar event exists
		if (
			"calendarAccountId" in changes &&
			changes.calendarAccountId !== meeting.calendarAccountId
		) {
			try {
				await deleteCalendarEvent(
					meeting.calendarAccountId,
					meeting.calendarEventId
				);
			} catch (error) {
				console.warn("Unable to delete calendar event", error);
			}
			//changes.calendarEventId = null;
			if (changes.calendarAccountId) {
				try {
					calendarEvent = await addCalendarEvent(
						changes.calendarAccountId,
						calendarEventParams
					);
					//changes.calendarEventId = calendarEvent?.id || null;
				} catch (error) {
					console.warn("Unable to add calendar event", error);
				}
			}
		} else {
			// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
			calendarEventParams.status = "confirmed";
			try {
				await updateCalendarEvent(
					meeting.calendarAccountId,
					meeting.calendarEventId,
					calendarEventParams
				);
			} catch (error) {
				console.warn("Unable to update calendar event", error);
			}
		}
	} else {
		// Calendar event does not exist
		if (updatedMeeting.calendarAccountId) {
			try {
				calendarEvent = await addCalendarEvent(
					updatedMeeting.calendarAccountId,
					calendarEventParams
				);
				//changes.calendarEventId = calendarEvent?.id || null;
			} catch (error) {
				console.warn("Unable to add calendar event", error);
			}
		}
	}

	return calendarEvent;
}

async function updateMeetingDB(id: number, changes: MeetingChange) {
	const setSql = meetingToSetSql(changes);
	if (setSql) {
		const sql = db.format(
			"UPDATE meetings SET " + setSql + " WHERE id=?;",
			[id]
		);
		await db.query(sql);
	}
}

/**
 * Update meeting, including changes to webex, calendar and imat.
 *
 * @param user The user executing the update
 * @param id The meeting identifier
 * @param changesIn Partial meeting object with parameters to be changed.
 * @returns An object the includes the meeting as updated, webex meeting events as updated and IMAT breakouts as updated.
 */
export async function updateMeeting(
	user: User,
	id: number,
	changesIn: MeetingChange
) {
	let changes: MeetingChange = {
		...changesIn,
		webexMeetingId: undefined,
		imatBreakoutId: undefined,
	};

	let [meeting] = await selectMeetings({ id });
	if (!meeting)
		throw new NotFoundError(`Meeting with id=${id} does not exist`);

	let session: Promise<Session | undefined> | Session | undefined;
	const sessionId = changes.sessionId || meeting.sessionId;
	if (sessionId) session = getSession(sessionId); // returns a promise

	let workingGroup: Promise<Group | undefined> | Group | undefined;
	const organizationId = changes.organizationId || meeting.organizationId;
	if (organizationId) workingGroup = getWorkingGroup(user, organizationId); // returns a promise

	/* Make Webex changes */
	let webexMeeting = await meetingMakeWebexUpdates(meeting, changesIn);
	if (webexMeeting && meeting.webexMeetingId !== webexMeeting.id)
		changes.webexMeetingId = webexMeeting.id;
	if (!webexMeeting && meeting.webexMeetingId) changes.webexMeetingId = null;

	session = await session; // do webex update while we wait for session

	/* Make IMAT breakout changes */
	let breakout = await meetingMakeImatBreakoutUpdates(
		user,
		meeting,
		changesIn,
		session,
		webexMeeting
	);
	if (breakout && meeting.imatBreakoutId !== breakout.id)
		changes.imatBreakoutId = breakout.id;
	if (!breakout && meeting.imatBreakoutId) changes.imatBreakoutId = null;

	workingGroup = await workingGroup; // do other updates while we wait for group

	/* Make calendar changes */
	const calendarEvent = await meetingMakeCalendarUpdates(
		meeting,
		changes,
		session,
		workingGroup,
		webexMeeting,
		breakout
	);
	if (calendarEvent && meeting.calendarEventId !== calendarEvent.id)
		changes.calendarEventId = calendarEvent.id;

	const setSql = meetingToSetSql(changes);
	if (setSql) {
		const sql = db.format(
			"UPDATE meetings SET " + setSql + " WHERE id=?;",
			[id]
		);
		await db.query(sql);
		[meeting] = await selectMeetings({ id });
	}

	return { meeting, webexMeeting, breakout };
}

/**
 * Update meetings.
 *
 * @param user The user executing the update
 * @param updates An array of update objects with shape {id, changes}
 * @returns An object that includes an array of meeting objects as updated, an array of webex Meeting events as updated and an array of IMAT breakouts as updated.
 */
export async function updateMeetings(
	user: User,
	updates: MeetingUpdate[]
): Promise<MeetingsUpdateResponse> {
	if (!user.ieeeClient) throw new AuthError("Not logged in");

	const entries = await Promise.all(
		updates.map((u) => updateMeeting(user, u.id, u.changes))
	);

	const meetings: Meeting[] = [],
		webexMeetings: WebexMeeting[] = [],
		breakouts: Breakout[] = [];

	entries.forEach((entry) => {
		meetings.push(entry.meeting);
		if (entry.webexMeeting) webexMeetings.push(entry.webexMeeting);
		if (entry.breakout) breakouts.push(entry.breakout);
	});

	return { meetings, webexMeetings, breakouts };
}

/**
 * Delete meetings.
 *
 * @param user The user executing the delete.
 * @param ids An array of meeting identifiers that identify the meetings to be deleted.
 * @returns The number of meetings deleted.
 */
export async function deleteMeetings(
	user: User,
	ids: number[]
): Promise<number> {
	if (!user.ieeeClient) throw new AuthError("Not logged in");

	type DeleteMeetingSelect = Pick<
		Meeting,
		| "webexAccountId"
		| "webexMeetingId"
		| "calendarAccountId"
		| "calendarEventId"
		| "imatMeetingId"
		| "imatBreakoutId"
	>;

	// prettier-ignore
	let sql = db.format(
		"SELECT " + 
			"webexAccountId, " + 
			"webexMeetingId, " + 
			"calendarAccountId, " + 
			"calendarEventId, " +
			"imatMeetingId, " + 
			"imatBreakoutId " + 
		"FROM meetings WHERE id IN (?);",
		[ids]
	);
	const entries = await db.query<(RowDataPacket & DeleteMeetingSelect)[]>(
		sql
	);
	for (const entry of entries) {
		if (entry.webexAccountId && entry.webexMeetingId) {
			try {
				await deleteWebexMeeting({
					accountId: entry.webexAccountId,
					id: entry.webexMeetingId,
				});
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
				// Webex meeting does not exist
			}
		}
		if (entry.imatMeetingId && entry.imatBreakoutId) {
			try {
				await deleteImatBreakouts(user, entry.imatMeetingId, [
					entry.imatBreakoutId,
				]);
			} catch (error) {
				console.log(error);
			}
		}
		if (entry.calendarAccountId && entry.calendarEventId) {
			try {
				await deleteCalendarEvent(
					entry.calendarAccountId,
					entry.calendarEventId
				);
			} catch (error) {
				console.log(error);
			}
		}
	}

	sql = db.format("DELETE FROM meetings WHERE id IN (?);", [ids]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
