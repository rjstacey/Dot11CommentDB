/*
 * imat.ieee.org HTML scraping
 */
import PropTypes from "prop-types";
import { DateTime, Duration } from "luxon";
import { load as cheerioLoad } from "cheerio";
import type { AxiosError } from "axios";

import type { User } from "./users.js";

import {
	csvParse,
	AuthError,
	NotFoundError,
	ForbiddenError,
	validateSpreadsheetHeader,
} from "../utils/index.js";
import { webexMeetingImatLocation } from "./meetings.js";
import { getGroupHierarchy } from "./groups.js";
import { getCredit } from "./sessions.js";

import type { MeetingCreate } from "@schemas/meetings.js";
import type { WebexMeeting } from "@schemas/webex.js";
import type { Session } from "@schemas/sessions.js";
import type { ContactInfo } from "@schemas/members.js";
import type { Group } from "@schemas/groups.js";
import type {
	Breakout,
	BreakoutCreate,
	BreakoutUpdate,
	ImatMeeting,
	ImatTimeslot,
	ImatCommittee,
	ImatBreakoutAttendance,
	ImatMeetingAttendance,
	ImatAttendanceSummary,
	GetImatBreakoutsResponse,
	ImatDailyAttendanceSummary,
} from "@schemas/imat.js";

type PageBreakout = {
	id: number;
	name: string;
	location: string;
	day: number;

	groupShortName: string;

	start: string;
	startTime: string;
	startSlotName: string;

	end: string;
	endTime: string;
	endSlotName: string;

	credit: string;
	creditOverrideNumerator: number;
	creditOverrideDenominator: number;

	facilitatorName: string /** Facilitator name */;

	editContext: string;
	editGroupId: string;
	formIndex: string /** Identifies the breakout for the delete post */;
};

/** The timeslots obtained from the session detail page do not have an id */
type PageTimeslot = Omit<ImatTimeslot, "id">;

/** Committees as listed on the web page */
type PageCommittee = {
	id: number;
	symbolName: string; // Committee symbol concatenated with the committee name
};

/** Committees as listed in CVS file */
type CsvCommittee = Omit<ImatCommittee, "id"> & {
	/** The CSV file uses a different identifier from the web page */
	id: string;
};

// Convert date to ISO format
/*function dateToISODate(dateStr: string) {
	// Date is in format: "11-Dec-2018"
	return DateTime.fromFormat(dateStr, "dd-MMM-yyyy").toISODate();
}*/

function csvDateToISODate(dateStr: string) {
	// Date is in format: "11/12/2018"
	return DateTime.fromFormat(dateStr, "MM/dd/yyyy").toISODate() || "";
}

function luxonTimeZone(timeZone: string) {
	// Luxon can't handle some of these shorter timezone names
	const map = {
		EST5EDT: "America/New_York",
		CST6CDT: "America/Chicago",
		MST7MDT: "America/Denver",
		PST8PDT: "America/Los_Angeles",
		EST: "America/New_York",
		HST: "Pacific/Honolulu",
		CET: "Europe/Vienna",
	};
	return map[timeZone] || timeZone;
}

function getPage(body: string, title: string) {
	// Use cheerio, which provides jQuery-like parsing
	const $ = cheerioLoad(body);

	const titleHtml = $("div.title").html();

	// If we get the "Sign In" page then the user is not logged in
	if (titleHtml == "Sign In") throw new AuthError("Not logged in");

	// Make sure we got the expected page
	if (titleHtml != title)
		throw new Error("Unexpected page returned by imat.ieee.org");

	return $;
}

const meetingsCsvHeader = [
	"Sponsor ID",
	"Event ID",
	"Sponsor Symbol",
	"Sponsor Name",
	"Event Name",
	"Event Type",
	"Start Date",
	"End Date",
	"Time Zone",
	"Street Line 1",
	"Street Line 2",
	"City",
	"State",
	"Zip",
	"Country",
	"Event Nomenclature",
	"Timeslot Nomenclature",
	"Breakout Nomenclature",
	"Local Server URL",
	"Event Access Code",
] as const;

async function parseMeetingsCsv(buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new Error("Empty meeting.csv file");

	// Row 0 is the header
	validateSpreadsheetHeader(p.shift()!, meetingsCsvHeader);

	const meetings = p.map((c) => {
		const meeting: ImatMeeting = {
			id: parseInt(c[1]),
			organizerId: c[0], // string
			organizerSymbol: c[2],
			organizerName: c[3],
			name: c[4],
			type: c[5],
			start: csvDateToISODate(c[6]),
			end: csvDateToISODate(c[7]),
			timezone: luxonTimeZone(c[8]),
		};
		return meeting;
	});

	return meetings;
}

/**
 * get IMAT meetings
 * @returns An array of IMAT meeting objects
 */
export async function getImatMeetings(user: User): Promise<ImatMeeting[]> {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const response = await ieeeClient.getAsBuffer(`/${user.Email}/meeting.csv`);
	if (response.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");

	const meetings = await parseMeetingsCsv(response.data);
	//console.log(meetings)
	return meetings;
}

async function getImatMeeting(user: User, id: number): Promise<ImatMeeting> {
	const meetings = await getImatMeetings(user);
	const meeting = meetings.find((m) => m.id === id);
	if (!meeting) throw new NotFoundError("Meeting does not exist");
	return meeting;
}

/* The "Add a new meeting" page contains a form for adding a meeting.
 * The form includes a select element with committee options and
 * select elements for timeslot start and end.
 *
 * It is possible to get the committees from a separate .csv, but the
 * IDs in the .csv are not the same as those in the committee select options.
 * The committee names in the select options area a join of the committee
 * symbol and name that are hard to separate.
 */
function parseAddMeetingPage(body: string) {
	const $ = getPage(body, "Add a new Meeting");

	// f1 selects the committee
	const pageCommittees: PageCommittee[] = [];
	$('select[name="f1"] > option').each(function () {
		// each option
		const id = parseInt($(this).attr("value") || "0");
		const symbolName = $(this).text();
		pageCommittees.push({ id, symbolName });
	});

	const timeslotsObj = {};
	// f12 selects timeslot start
	$('select[name="f12"] > option').each(function () {
		const id = parseInt($(this).attr("value") || "0");
		const p = $(this).html()!.split("&nbsp;");
		const name = p[0];
		const startTime = p[1];
		timeslotsObj[id] = { id, name, startTime };
	});

	// f11 selects timeslot end
	$('select[name="f11"] > option').each(function () {
		const id = parseInt($(this).attr("value") || "0");
		const p = $(this).html()!.split("&nbsp;");
		timeslotsObj[id].endTime = p[1];
	});

	const timeslots: ImatTimeslot[] = Object.values(timeslotsObj); // convert to array

	return { pageCommittees, timeslots };
}

/*function parseEditMeetingPage(body: string): {
	committees: PageCommittee[];
	timeslots: ImatTimeslot[];
} {
	const $ = getPage(body, "Edit Meeting");

	// f1 selects the committee
	const committees: PageCommittee[] = [];
	$('select[name="f3"] > option').each(function (index) {
		// each option
		const id = parseInt($(this).attr("value") || "0");
		const symbolName = $(this).text();
		committees.push({ id, symbolName });
	});

	let timeslotsObj = {};
	// f12 selects timeslot start
	$('select[name="f16"] > option').each(function (index) {
		const id = parseInt($(this).attr("value") || "0");
		const p = $(this).html()!.split("&nbsp;");
		const name = p[0];
		const startTime = p[1];
		timeslotsObj[id] = { id, name, startTime };
	});

	// f11 selects timeslot end
	$('select[name="f15"] > option').each(function (index) {
		const id = parseInt($(this).attr("value") || "0");
		const p = $(this).html()!.split("&nbsp;");
		timeslotsObj[id].endTime = p[1];
	});

	let timeslots = Object.values(timeslotsObj) as ImatTimeslot[]; // convert to array

	return { committees, timeslots };
}*/

const committeesCsvHeader = [
	"Committee ID",
	"Parent Committee ID",
	"Committee Type",
	"Committee Symbol",
	"Committee Short Name",
	"Committee Name",
] as const;

async function parseImatCommitteesCsv(buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new Error("Empty committees.csv file");

	// Row 0 is the header
	validateSpreadsheetHeader(p.shift()!, committeesCsvHeader);

	return p.map((c) => {
		const committee: CsvCommittee = {
			id: c[0], // string
			parentId: c[1], // string
			type: c[2],
			symbol: c[3],
			shortName: c[4],
			name: c[5],
		};
		return committee;
	});
}

/**
 * Get IMAT committees
 * @param user The user executing the get
 * @param group The working group
 */
export async function getImatCommittees(user: User, group: Group) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const response = await ieeeClient
		.getAsBuffer(`/${group.name}/committees.csv`)
		.catch((err: AxiosError) => {
			if (err.response && err.response.status === 403) {
				throw new ForbiddenError(
					"You do not have permission to retrieve IMAT committees"
				);
			}
			throw err;
		});
	if (response.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");

	const committees = await parseImatCommitteesCsv(response.data);
	//console.log(committees)
	return committees;
}

/*const breakoutsCvsHeader = [
	"Breakout ID",
	"Start Timeslot Name",
	"End Timeslot Name",
	"Start",
	"End",
	"Location",
	"Group Symbol",
	"Breakout Name",
	"Credit",
	"Override Credit Numerator",
	"Override Credit Denominator",
	"Event Day",
	"Facilitator Web Id",
] as const;*/

export function parseSessionDetailPage(body: string) {
	let m: string[] | null, href: string;

	const $ = getPage(body, "Session detail");

	m = /<td>(.*) Time Zone<\/td>/.exec(body);
	if (!m) throw new Error("On IMAT 'Session detail', can't find timezone");
	const timezone = m[1];

	m = /<td>(\d{2}-[a-zA-Z]{3}-\d{4}) - (\d{2}-[a-zA-Z]{3}-\d{4})<\/td>/.exec(
		body
	);
	if (!m)
		throw new Error("On IMAT 'Session detail', can't find session dates");
	const sessionStart = DateTime.fromFormat(m[1], "dd-MMM-yyyy", {
		zone: timezone,
	});

	const pageBreakouts: PageBreakout[] = [];
	const timeslots: { [id: string]: PageTimeslot } = {};

	$(".b_data_row").each(function () {
		// each table data row
		const tds = $(this).find("td");
		//console.log(tds.length)
		if (tds.length === 4) {
			// Timeslots table
			const t: PageTimeslot = {
				name: tds.eq(0).text(),
				startTime: tds.eq(1).text(),
				endTime: tds.eq(2).text(),
			};
			timeslots[t.name] = t;
		}

		if (tds.length === 9) {
			// Breakouts table
			// timePeriod has one of two formats:
			//   "PM2 - PM3 Sun, 12-Mar-2023<br>18:00 - 19:30" or
			//   "AM1 Mon, 13-Mar-2023<br>08:00 - 10:00"
			// There is a slot range if the start slot and end slot are different from each other.
			const timePeriod = tds.eq(0).html() || "";
			m =
				/(.+)&nbsp;[a-zA-Z]{3}, (\d{2}-[a-zA-Z]{3}-\d{4})<br>(\d{2}:\d{2})&nbsp;-&nbsp;(\d{2}:\d{2})/.exec(
					timePeriod
				);
			if (!m)
				throw new Error(
					"On IMAT 'Session detail', can't parse Time Period column; got " +
						timePeriod
				);
			const slotsRange = m[1];
			const eventDate = DateTime.fromFormat(m[2], "dd-MMM-yyyy", {
				zone: timezone,
			});
			const day = eventDate.diff(sessionStart, "days").get("days");
			const startTime = m[3];
			const endTime = m[4];
			const start =
				eventDate
					.set({
						hour: Number(m[3].substring(0, 2)),
						minute: Number(m[3].substring(3)),
					})
					.toISO() || "";
			const end =
				eventDate
					.set({
						hour: Number(m[4].substring(0, 2)),
						minute: Number(m[4].substring(3)),
					})
					.toISO() || "";

			m = /(.+)&nbsp;-&nbsp;(.+)/.exec(slotsRange);
			const startSlotName = m ? m[1] : slotsRange;
			const endSlotName = m ? m[2] : slotsRange;

			//b.startSlot = timeslots[b.startSlotName];
			//b.endSlot = timeslots[b.endSlotName];
			//b.startSlotId = b.startSlot? b.startSlot.id: null;
			//b.endSlotId = b.endSlot? b.endSlot.id: null;

			const location = tds.eq(1).text();
			const facilitatorName = tds.eq(2).text();
			const groupShortName = tds.eq(3).text();
			const name = tds.eq(4).text() || "";

			const creditStr = tds.eq(5).text() || "";
			const {
				credit,
				creditOverrideNumerator,
				creditOverrideDenominator,
			} = getCredit(creditStr);

			href =
				tds.eq(7).find('a[href*="breakout-edit"]').attr("href") || "";
			if (!href)
				throw new Error(
					"On IMAT 'Session detail', can't find edit breakout link"
				);
			m = /\/(.*)\/breakout-edit\?t=(\d+)&p=(\d+)&fc=(.+)/.exec(href);
			if (!m)
				throw new Error(
					"On IMAT 'Session detail', can't parse edit breakout link"
				);
			const id = parseInt(m[2]);
			//b.imatMeetingId = parseInt(m[3]);
			const editContext = decodeURIComponent(m[4]);
			const editGroupId = m[1];

			const inputName = $(`input[value="${id}"]`).attr("name");
			if (!inputName)
				throw new Error(
					"On IMAT 'Session detail', can't find breakout delete checkbox"
				);
			m = /f5_(\d+)/.exec(inputName);
			if (!m)
				throw new Error(
					"On IMAT 'Session detail', can't parse input field"
				);
			const formIndex = m[1];

			//console.log(b);
			pageBreakouts.push({
				id,
				name,
				location,
				day,
				groupShortName,
				start,
				startTime,
				startSlotName,
				end,
				endTime,
				endSlotName,
				credit,
				creditOverrideNumerator,
				creditOverrideDenominator,
				facilitatorName,
				editContext,
				editGroupId,
				formIndex,
			});
		}
	});

	return { pageBreakouts, timeslots };
}

/*async function parseImatBreakoutsCsv(session: Session, buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new Error("Empty breakouts.csv file");

	// Row 0 is the header
	validateSpreadsheetHeader(p.shift()!, breakoutsCvsHeader);

	return p.map((c) => {
		const eventDay = Number(c[11]); // day offset from start of session
		const eventDate = DateTime.fromISO(session.startDate, {
			zone: session.timezone,
		}).plus(Duration.fromObject({ days: eventDay }));
		const breakout = {
			id: parseInt(c[0]),
			startSlotName: c[1],
			endSlotName: c[2],
			day: parseInt(c[11]),
			start: eventDate
				.set({
					hour: Number(c[3].substring(0, 2)),
					minute: Number(c[3].substring(3)),
				})
				.toISO(),
			end: eventDate
				.set({
					hour: Number(c[4].substring(0, 2)),
					minute: Number(c[4].substring(3)),
				})
				.toISO(),
			timezone: session.timezone,
			location: c[5],
			group: c[6],
			name: c[7],
			credit: c[8],
			overrideCreditNumerator: Number(c[9]),
			overrideCreditDenominator: Number(c[10]),
			facilitator: c[12],
		};
		return breakout;
	});
}*/

/*const timeslotsCsvHeader = [
	"Event ID",
	"Timeslot ID",
	"Timeslot Name",
	"Start Time",
	"End Time",
] as const;

async function parseImatTimeslotCsv(buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new Error("Empty timeslot.csv file");

	// Row 0 is the header
	validateSpreadsheetHeader(p.shift()!, timeslotsCsvHeader);

	return p.map((c) => ({
		id: parseInt(c[1]),
		name: c[2],
		startTime: c[3],
		endTime: c[4],
	}));
}*/

/**
 * Get breakouts for an IMAT meeting
 * @param user The user executing the get
 * @param imatMeetingId The IMAT meeting number
 */
export async function getImatBreakoutsInternal(
	user: User,
	imatMeetingId: number
) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	const url1 = `/${imatMeeting.organizerId}/meeting-detail?p=${imatMeetingId}`;
	const response1 = await ieeeClient.get(url1);
	const { pageBreakouts } = parseSessionDetailPage(response1.data);

	const response2 = await ieeeClient.getAsBuffer(`/802.11/committees.csv`);
	if (response2.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");
	const csvCommittees = await parseImatCommitteesCsv(response2.data);

	const url2 = `/${imatMeeting.organizerId}/breakout?p=${imatMeetingId}`;
	const response3 = await ieeeClient.get(url2);
	const { timeslots, pageCommittees } = parseAddMeetingPage(response3.data);

	/* The committees in the committees.csv file do not have the same ID as that used
	 * for the committee options in the "Add a new meeting" form. The committee options
	 * label is symbol + ' ' + name trucated at around 62 characters. Use the committee
	 * list from the CSV file, but use the committee identifier from the web page. */
	const committees: ImatCommittee[] = csvCommittees.map((c1) => {
		const c2 = pageCommittees.find(
			(c2) =>
				c2.symbolName.search(
					(c1.symbol + " " + c1.name).substring(0, 60)
				) === 0
		);
		return {
			...c1,
			id: c2 ? c2.id : 0,
		};
	});

	/* Override the timeslots from session detail page; the user may not have permission to modify the timeslots
	 * and thus might not get the slot ID. */
	const breakouts: Breakout[] = pageBreakouts.map((b) => {
		const { startSlotName, endSlotName, groupShortName, ...rest } = b;
		const startSlot = timeslots.find((t) => t.name === startSlotName)!;
		const endSlot = timeslots.find((t) => t.name === endSlotName)!;
		const committee = committees.find(
			(c) => c.shortName === groupShortName
		)!;
		return {
			...rest,
			startSlotId: startSlot.id,
			endSlotId: endSlot.id,
			groupId: committee.id,
			symbol: committee.symbol,
			facilitator: "",
		};
	});

	return {
		imatMeeting,
		breakouts,
		timeslots,
		committees,
		pageCommittees,
	};
}

export async function getImatBreakouts(
	user: User,
	imatMeetingId: number
): Promise<GetImatBreakoutsResponse> {
	return getImatBreakoutsInternal(user, imatMeetingId);
}

const breakoutCredit = {
	Normal: 1,
	Extra: 2,
	Zero: 3,
	Other: 4,
};

const breakoutProps = {
	name: PropTypes.string.isRequired,
	groupId: PropTypes.number.isRequired,
	day: PropTypes.number.isRequired,
	startSlotId: PropTypes.number.isRequired,
	startTime: PropTypes.string.isRequired,
	endSlotId: PropTypes.number.isRequired,
	endTime: PropTypes.string.isRequired,
	location: PropTypes.string.isRequired,
	credit: PropTypes.oneOf(Object.keys(breakoutCredit)).isRequired,
	facilitator: PropTypes.string,
};

async function addImatBreakout(
	user: User,
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	pageCommittees: PageCommittee[],
	breakout: BreakoutCreate
): Promise<Breakout> {
	PropTypes.checkPropTypes(
		breakoutProps,
		breakout,
		"breakout",
		"addImatBreakout"
	);

	const { ieeeClient } = user;

	const params = {
		v: 1,
		f2: breakout.name,
		f1: breakout.groupId,
		f6: breakout.day,
		f12: breakout.startSlotId,
		f10: breakout.startTime,
		f11: breakout.endSlotId,
		f7: breakout.endTime,
		f0: breakout.location,
		f4: breakoutCredit[breakout.credit],
		f8: breakout.facilitator || user.Email,
		f9: "OK/Done",
	};

	const url = `/${imatMeeting.organizerId}/breakout?p=${imatMeeting.id}`;
	const response = await ieeeClient!.post(url, params);
	//console.log(response)

	if (
		response.data.search(
			/<title>IEEE Standards Association - Event detail<\/title>/
		) === -1
	) {
		const m = response.data.match(/<div class="field_err">(.*)<\/div>/);
		throw new Error(m ? m[1] : "An unexpected error occured");
	}

	/* From the response, find the breakout we just added */
	const { pageBreakouts } = parseSessionDetailPage(response.data);

	/* Override the timeslots from session detail page; the user may not have permission to modify the timeslots
	 * and thus might not get the slot ID. */
	const breakouts: Breakout[] = pageBreakouts.map((b) =>
		pageBreakoutToBreakout(b, timeslots, pageCommittees)
	);

	const b = breakouts.find(
		(b) =>
			breakout.name.trim() === b.name &&
			breakout.location?.trim() === b.location &&
			breakout.day === b.day &&
			breakout.startSlotId === b.startSlotId
	);

	if (!b) {
		console.log(breakouts, breakout);
		throw new Error("Can't find the breakout we just added");
	}

	return b;
}

function pageBreakoutToBreakout(
	pageBreakout: PageBreakout,
	timeslots: ImatTimeslot[],
	pageCommittees: PageCommittee[]
): Breakout {
	const { startSlotName, endSlotName, groupShortName, ...rest } =
		pageBreakout;
	const startSlot = timeslots.find((t) => t.name === startSlotName);
	if (!startSlot) throw new Error("Can't find startSlot " + startSlotName);
	const endSlot = timeslots.find((t) => t.name === endSlotName);
	if (!endSlot) throw new Error("Can't find endSlot " + endSlotName);
	// The committee symbolName is something like "C/LM/WG802.11/802.11ax Standard...", where the short name follows
	// the last slash and is followed by a space.
	const re = new RegExp(`(.*/${groupShortName}) `);
	const committee = pageCommittees.find((c) => re.test(c.symbolName));
	if (!committee)
		throw new Error("Can't find committee for " + groupShortName);
	const symbol = re.exec(committee.symbolName)![1];
	return {
		...rest,
		startSlotId: startSlot.id,
		endSlotId: endSlot.id,
		groupId: committee.id,
		symbol,
		facilitator: "",
	};
}

export async function addImatBreakouts(
	user: User,
	imatMeetingId: number,
	breakouts: BreakoutCreate[]
) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	const url = `/${imatMeeting.organizerId}/breakout?p=${imatMeeting.id}`;
	const response = await ieeeClient.get(url);
	const { timeslots, pageCommittees } = parseAddMeetingPage(response.data);

	breakouts = await Promise.all(
		breakouts.map((breakout) =>
			addImatBreakout(
				user,
				imatMeeting,
				timeslots,
				pageCommittees,
				breakout
			)
		)
	);

	return { breakouts };
}

export async function deleteImatBreakouts(
	user: User,
	imatMeetingId: number,
	ids: number[]
) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const imatMeeting = await getImatMeeting(user, imatMeetingId);

	const url = `/${imatMeeting.organizerId}/meeting-detail?p=${imatMeetingId}`;
	const response = await ieeeClient.get(url);
	const { pageBreakouts } = parseSessionDetailPage(response.data);

	const breakoutsToDelete = ids.map((id) => {
		const b = pageBreakouts.find((b) => b.id === id);
		if (!b) throw new NotFoundError(`Breakout ${id} not found`);
		return b;
	});

	const params = {
		tz: 420,
		v: 1,
		f3: "",
		f4: 0,
		f2: "Delete",
	};

	pageBreakouts.forEach((b) => (params["f5_" + b.formIndex] = b.id));
	breakoutsToDelete.forEach((b) => (params["f1_" + b.formIndex] = "on"));

	await ieeeClient.post(url, params);

	return ids.length;
}

async function updateImatBreakout(
	user: User,
	imatMeeting: ImatMeeting,
	breakout: BreakoutUpdate
) {
	PropTypes.checkPropTypes(
		breakoutProps,
		breakout,
		"breakout",
		"updateImatBreakout"
	);

	const params = {
		tz: 420,
		v: 1,
		c: breakout.editContext, // necessary!
		f4: breakout.name,
		f3: breakout.groupId,
		f8: breakout.day,
		f16: breakout.startSlotId,
		f14: breakout.startTime,
		f15: breakout.endSlotId,
		f9: breakout.endTime,
		f2: breakout.location,
		f6: breakoutCredit[breakout.credit],
		f1: breakout.creditOverrideNumerator,
		f0: breakout.creditOverrideDenominator,
		f10: breakout.facilitator || user.Email,
		f12: "OK/Done",
	};
	//console.log(params)

	const url = `/${breakout.editGroupId}/breakout-edit?t=${breakout.id}&p=${imatMeeting.id}`;
	const response = await user.ieeeClient!.post(url, params);

	if (
		response.data.search(
			/<title>IEEE Standards Association - Event detail<\/title>/
		) === -1
	) {
		const m = /<div class="field_err">(.*)<\/div>/.exec(response.data);
		throw new Error(m ? m[1] : "An unexpected error occured");
	}

	/* From the response, find the breakout we just updated */
	const { pageBreakouts } = parseSessionDetailPage(response.data);
	//console.log(breakouts);

	const b = pageBreakouts.find((b) => breakout.id === b.id);
	if (!b) throw new NotFoundError("Unable to find updated breakout");

	return b;
}

export async function updateImatBreakouts(
	user: User,
	imatMeetingId: number,
	breakouts: BreakoutUpdate[]
) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	const url = `/${imatMeeting.organizerId}/breakout?p=${imatMeeting.id}`;
	const response = await ieeeClient.get(url);
	const { timeslots, pageCommittees } = parseAddMeetingPage(response.data);

	const pageBreakouts = await Promise.all(
		breakouts.map((breakout) =>
			updateImatBreakout(user, imatMeeting, breakout)
		)
	);

	// Correct the timeslots and committee from session detail page
	breakouts = pageBreakouts.map((b) =>
		pageBreakoutToBreakout(b, timeslots, pageCommittees)
	);

	return breakouts;
}

function slotDateTime(date: DateTime, slot: ImatTimeslot) {
	return [
		date.set({
			hour: Number(slot.startTime.substring(0, 2)),
			minute: Number(slot.startTime.substring(3, 5)),
		}),
		date.set({
			hour: Number(slot.endTime.substring(0, 2)),
			minute: Number(slot.endTime.substring(3, 5)),
		}),
	];
}

async function meetingToBreakout(
	user: User,
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	committees: ImatCommittee[],
	session: Session | undefined,
	meeting: MeetingCreate,
	webexMeeting: WebexMeeting | undefined,
	breakout?: Breakout
) {
	const sessionStart = DateTime.fromISO(imatMeeting.start, {
		zone: imatMeeting.timezone,
	});
	const sessionEnd = DateTime.fromISO(imatMeeting.end, {
		zone: imatMeeting.timezone,
	}).plus({ days: 1 });
	const start = DateTime.fromISO(meeting.start, {
		zone: imatMeeting.timezone,
	});
	const end = DateTime.fromISO(meeting.end, { zone: imatMeeting.timezone });
	//console.log(imatMeeting.start, meeting.start)

	// Verify that the meeting is within the date range of the session
	if (start < sessionStart || start > sessionEnd)
		throw new TypeError("Meeting outside date range for session");

	const day = Math.floor(start.diff(sessionStart, "days").get("day"));
	let startTime = start.toFormat("HH:mm");
	let endTime = end.toFormat("HH:mm");

	// If breakout straddles a day, then end at midnight
	if (end.toISODate() !== start.toISODate()) endTime = "23:59";

	const breakoutDate = sessionStart.plus({ days: day });
	let startSlot: ImatTimeslot | undefined, endSlot: ImatTimeslot | undefined;

	// Go through slots looking for exact match
	for (const slot of timeslots) {
		const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
		if (start >= slotStart && end <= slotEnd) {
			startSlot = slot;
			endSlot = slot;
			break;
		}
	}

	if (!startSlot) {
		// Look for the last slot that starts after the meeting starts
		for (const slot of timeslots) {
			const [slotStart] = slotDateTime(breakoutDate, slot);
			if (start >= slotStart) startSlot = slot;
		}
	}

	if (!endSlot) {
		// Look for the first slot that ends before meeting ends
		for (const slot of timeslots) {
			const [, slotEnd] = slotDateTime(breakoutDate, slot);
			if (end <= slotEnd) {
				endSlot = slot;
				break;
			}
		}
	}

	// If we still don't have a start slot, choose the first (or last) and override time
	if (!startSlot) startSlot = timeslots[0];
	if (!endSlot) endSlot = timeslots[timeslots.length - 1];

	if (!startSlot) throw new TypeError("Can't find start slot");

	if (!endSlot) throw new TypeError("Can't find end slot");

	// If the startTime/endTime aligns with slot start/end then clear time
	if (
		startSlot &&
		slotDateTime(breakoutDate, startSlot)[0].toFormat("HH:mm") === startTime
	)
		startTime = "";
	if (
		endSlot &&
		slotDateTime(breakoutDate, endSlot)[1].toFormat("HH:mm") === endTime
	)
		endTime = "";

	const groupHeirarchy = await getGroupHierarchy(
		user,
		meeting.organizationId
	);
	const group = groupHeirarchy[0];
	if (!group)
		throw new TypeError(`Can't find group id=${meeting.organizationId}`);
	const ancestorGroupWithSymbol = groupHeirarchy.find((g) => g.symbol);
	if (!ancestorGroupWithSymbol)
		throw new TypeError(
			`Can't find committe for ${group.name}. Tried anscestors.`
		);
	const symbol = ancestorGroupWithSymbol.symbol;
	const committee = committees.find((c) => c.symbol === symbol);
	if (!committee)
		throw new TypeError(
			`Can't find committee symbol=${symbol} (group: ${ancestorGroupWithSymbol.name})`
		);
	const groupId = committee.id;

	let location = meeting.location || "";
	let credit: string | undefined,
		creditOverrideNumerator = 0,
		creditOverrideDenominator = 0;

	if (session && (session.type === "p" || session.type === "i")) {
		if (Array.isArray(session.rooms)) {
			const room = session.rooms.find(
				(room) => room.id === meeting.roomId
			);
			if (room) location = room.name;
		}

		if (!credit) {
			credit = "Extra";
			creditOverrideNumerator = 0;
			creditOverrideDenominator = 0;

			// Find the equivalent session timeslot
			const slotIndex = session.timeslots.findIndex(
				(slot) =>
					slot.name === startSlot?.name ||
					slot.startTime === startSlot?.startTime
			);
			const dayCredits = session.defaultCredits[day];
			if (slotIndex >= 0 && dayCredits) {
				const c = getCredit(dayCredits[slotIndex] || "Extra");
				credit = c.credit;
				creditOverrideNumerator = c.creditOverrideNumerator;
				creditOverrideDenominator = c.creditOverrideDenominator;
			}
		}
	}

	if (!location && meeting.webexAccountId && webexMeeting)
		location = await webexMeetingImatLocation(
			meeting.webexAccountId,
			webexMeeting
		);

	// We often change the credit in IMAT itself. So if this is an update use the existing setting.
	if (breakout) {
		credit = breakout.credit;
		creditOverrideNumerator = breakout.creditOverrideNumerator;
		creditOverrideDenominator = breakout.creditOverrideDenominator;
	}

	if (!credit) {
		credit = "Zero";
		creditOverrideNumerator = 0;
		creditOverrideDenominator = 0;
	}

	let name = meeting.summary;

	if (meeting.isCancelled) {
		name = "CANCELLED - " + name;
		location = "CANCELLED";
		credit = "Zero";
		creditOverrideNumerator = 0;
		creditOverrideDenominator = 0;
	}

	const breakoutOut: BreakoutCreate = {
		name,
		location,
		groupId,
		symbol: committee.symbol,
		day,
		startSlotId: startSlot.id,
		endSlotId: endSlot.id,
		startTime,
		endTime,
		credit,
		creditOverrideNumerator,
		creditOverrideDenominator,
		facilitator: user.Email,
	};

	return breakoutOut;
}

/** Convert breakout start to a datetime */
function breakoutStart(
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	breakout: BreakoutCreate
) {
	const startSlot =
		timeslots.find((t) => t.id === breakout.startSlotId) || timeslots[0];
	const t = breakout.startTime || startSlot.startTime;
	const [hh, mm] = t.split(":");
	return DateTime.fromISO(imatMeeting.start)
		.plus(Duration.fromObject({ days: breakout.day }))
		.set({ hour: Number(hh), minute: Number(mm) });
}

/** Convert breakout end to a datetime */
function breakoutEnd(
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	breakout: BreakoutCreate
) {
	const endSlot =
		timeslots.find((t) => t.id === breakout.endSlotId) || timeslots[0];
	const t = breakout.endTime || endSlot.endTime;
	const [hh, mm] = t.split(":");
	return DateTime.fromISO(imatMeeting.start)
		.plus(Duration.fromObject({ days: breakout.day }))
		.set({ hour: Number(hh), minute: Number(mm) });
}

/** Determine if a datetime value overlaps with a breakout period. A datetime that lies on a breakout boundary (start or end) does not count. */
function datetimeHasBreakoutOverlap(
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	breakouts: Breakout[],
	datetime: DateTime
) {
	for (const b of breakouts) {
		const bStart = breakoutStart(imatMeeting, timeslots, b);
		const bEnd = breakoutEnd(imatMeeting, timeslots, b);
		if (datetime > bStart && datetime < bEnd) return true;
	}
	return false;
}

/** Add grace period provided the new time does not overlap with another breakout */
function breakoutAddGracePeriod<B extends BreakoutCreate>(
	imatMeeting: ImatMeeting,
	timeslots: ImatTimeslot[],
	breakouts: Breakout[],
	breakout: B,
	gracePeriod: number
): B {
	let start = breakoutStart(imatMeeting, timeslots, breakout);
	start = start.minus({ minute: gracePeriod });
	let dayStart = DateTime.fromISO(imatMeeting.start).plus({
		days: breakout.day,
	});
	if (
		start >= dayStart && // Don't start before the start of the day
		!datetimeHasBreakoutOverlap(imatMeeting, timeslots, breakouts, start)
	) {
		const h = ("0" + start.get("hour")).slice(-2);
		const m = ("0" + start.get("minute")).slice(-2);
		breakout = { ...breakout, startTime: `${h}:${m}` };
	}
	let end = breakoutEnd(imatMeeting, timeslots, breakout);
	end = end.plus({ minute: gracePeriod });
	dayStart = dayStart.plus({ days: 1 });
	if (
		end <= dayStart && // Don't extend beyond the end of the day
		!datetimeHasBreakoutOverlap(imatMeeting, timeslots, breakouts, end)
	) {
		const h = ("0" + end.get("hour")).slice(-2);
		const m = ("0" + end.get("minute")).slice(-2);
		breakout = { ...breakout, endTime: `${h}:${m}` };
	}
	return breakout;
}

export async function addImatBreakoutFromMeeting(
	user: User,
	session: Session | undefined,
	meeting: MeetingCreate,
	webexMeeting: WebexMeeting | undefined
): Promise<Breakout> {
	const imatMeetingId = meeting.imatMeetingId;
	if (typeof imatMeetingId !== "number")
		throw new TypeError("IMAT meeting ID not specified");

	const { imatMeeting, breakouts, timeslots, committees, pageCommittees } =
		await getImatBreakoutsInternal(user, imatMeetingId);

	let breakout: BreakoutCreate = await meetingToBreakout(
		user,
		imatMeeting,
		timeslots,
		committees,
		session,
		meeting,
		webexMeeting
	);

	if (meeting.imatGracePeriod) {
		breakout = breakoutAddGracePeriod(
			imatMeeting,
			timeslots,
			breakouts,
			breakout,
			meeting.imatGracePeriod
		);
	}

	const breakoutOut = await addImatBreakout(
		user,
		imatMeeting,
		timeslots,
		pageCommittees,
		breakout
	);

	if (breakout.credit === "Other") {
		/* The "add new meeting" form does not support credit override; we need an update to handle that */
		breakoutOut.credit = breakout.credit;
		breakoutOut.creditOverrideNumerator = breakout.creditOverrideNumerator;
		breakoutOut.creditOverrideDenominator =
			breakout.creditOverrideDenominator;
		await updateImatBreakout(user, imatMeeting, breakoutOut);
	}

	return breakoutOut;
}

export async function updateImatBreakoutFromMeeting(
	user: User,
	session: Session | undefined,
	meeting: MeetingCreate,
	webexMeeting: WebexMeeting | undefined
) {
	const { imatMeetingId, imatBreakoutId } = meeting;
	if (typeof imatMeetingId !== "number")
		throw new TypeError("IMAT meeting ID not specified");
	if (typeof imatBreakoutId !== "number")
		throw new TypeError("IMAT breakout ID not specified");

	const { imatMeeting, breakouts, timeslots, committees } =
		await getImatBreakouts(user, imatMeetingId);

	let breakout = breakouts.find((b) => b.id === imatBreakoutId);
	if (!breakout)
		throw new NotFoundError(
			`Breakout id=${imatBreakoutId} does not exist for imatMeetingId=${imatMeetingId}`
		);

	const updatedBreakout_ = await meetingToBreakout(
		user,
		imatMeeting,
		timeslots,
		committees,
		session,
		meeting,
		webexMeeting,
		breakout
	);
	let updatedBreakout: BreakoutUpdate = {
		...updatedBreakout_,
		id: imatBreakoutId,
		editContext: breakout.editContext,
		editGroupId: breakout.editGroupId,
	};

	if (meeting.imatGracePeriod) {
		updatedBreakout = breakoutAddGracePeriod(
			imatMeeting,
			timeslots,
			breakouts,
			updatedBreakout,
			meeting.imatGracePeriod
		);
	}

	const startSlot = timeslots.find(
		(s) => s.id === updatedBreakout.startSlotId
	)!;
	const endSlot = timeslots.find((s) => s.id === updatedBreakout.endSlotId)!;

	const doUpdate =
		breakout.name !== updatedBreakout.name ||
		breakout.groupId !== updatedBreakout.groupId ||
		breakout.day !== updatedBreakout.day ||
		breakout.location !== updatedBreakout.location ||
		//breakout.facilitator !== updatedBreakout.facilitator ||
		breakout.credit !== updatedBreakout.credit ||
		(breakout.credit === "Other" &&
			(breakout.creditOverrideNumerator !==
				updatedBreakout.creditOverrideNumerator ||
				breakout.creditOverrideDenominator !==
					updatedBreakout.creditOverrideDenominator)) ||
		breakout.startSlotId !== updatedBreakout.startSlotId ||
		breakout.endSlotId !== updatedBreakout.endSlotId ||
		breakout.startTime !==
			(updatedBreakout.startTime || startSlot.startTime) ||
		breakout.endTime !== (updatedBreakout.endTime || endSlot.endTime);

	console.log("IMAT breakout update " + (doUpdate ? "needed" : "not needed"));
	if (doUpdate) {
		console.log(breakout, updatedBreakout);
		await updateImatBreakout(user, imatMeeting, updatedBreakout);
		breakout = {
			...updatedBreakout,
			start: "", // Fix!
			end: "",
		};
	}

	return breakout;
}

function getTimestamp(t: string) {
	const date = new Date(t);
	return isNaN(date.valueOf()) ? null : date.toISOString();
}

/*
 * Get IMAT breakout attendance
 */
export async function getImatBreakoutAttendance(
	user: User,
	imatMeetingId: number,
	breakoutId: number
): Promise<ImatBreakoutAttendance[]> {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const url = `/802.11/breakout-members?t=${breakoutId}&p=${imatMeetingId}`;
	const { data } = await ieeeClient.get(url);
	const $ = cheerioLoad(data);

	const title = $("div.title").html() || "";
	if (title === "Sign In") throw new AuthError("Not logged in");

	if (!title.startsWith("Meeting attendance for"))
		throw new Error("Unexpected page returned by imat.ieee.org");

	const attendance: ImatBreakoutAttendance[] = [];
	$(".b_data_row").each(function () {
		// each table data row
		const tds = $(this).find("td");
		const parts = tds.eq(1).text().split(",");
		const LastName = parts[0].trim();
		const FirstName = parts.length > 1 ? parts[1].trim() : "";
		const Name = FirstName ? FirstName + " " + LastName : LastName;
		const entry = {
			SAPIN: Number(tds.eq(0).text()),
			Name,
			Email: tds.eq(2).text(),
			Timestamp: getTimestamp(tds.eq(3).text()),
			Affiliation: tds.eq(4).text(),
		} satisfies ImatBreakoutAttendance;
		attendance.push(entry);
	});

	return attendance;
}

const imatMeetingAttendanceHeader = [
	"Committee",
	"Breakout",
	"SA PIN",
	"Name",
	"Email",
	"Timestamp",
	"Affiliation",
] as const;

async function parseImatMeetingAttendance(
	buffer: Buffer,
	imatMeeting: ImatMeeting
) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new Error("Got empty meeting-members.csv");

	validateSpreadsheetHeader(p.shift()!, imatMeetingAttendanceHeader);

	return p.map((c, i) => {
		if (isNaN(parseInt(c[2]))) console.log(c);
		const entry: ImatMeetingAttendance = {
			id: i,
			committee: c[0],
			breakoutName: c[1],
			SAPIN: parseInt(c[2]),
			Name: c[3],
			Email: c[4],
			Timestamp:
				DateTime.fromFormat(c[5], "dd-MMM-yyyy HH:mm:ss", {
					zone: imatMeeting.timezone,
				}).toISO() || "",
			Affiliation: c[6],
		};
		return entry;
	});
}

export async function getImatMeetingAttendance(
	user: User,
	imatMeetingId: number
): Promise<ImatMeetingAttendance[]> {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const imatMeeting = await getImatMeeting(user, imatMeetingId);

	const url = `/${imatMeeting.organizerId}/meeting-members.csv?p=${imatMeetingId}`;
	const response = await ieeeClient.getAsBuffer(url);
	if (response.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");

	return parseImatMeetingAttendance(response.data, imatMeeting);
}

const attendanceSummaryHeader = [
	"SA PIN",
	"Last Name",
	"First Name",
	"Middle Name",
	"Email",
	"Affiliation",
	"Current Involvement Level",
] as const;

async function parseImatMeetingAttendanceSummary(buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: false,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new TypeError("Got empty attendance_summary.csv");

	validateSpreadsheetHeader(p.shift()!, attendanceSummaryHeader);

	return p.map((c) => {
		const entry: ImatAttendanceSummary = {
			SAPIN: parseInt(c[0]),
			Name: "",
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
			Affiliation: c[5],
			Status: c[6],
			AttendancePercentage: Number(c[7]),
		};
		entry.Name = entry.FirstName;
		if (entry.MI) entry.Name += " " + entry.MI;
		entry.Name += " " + entry.LastName;
		return entry;
	});
}

/**
 * Get IMAT attendance summary by date
 * @param user - The user executing the get
 * @param groupName - Working group name
 * @param start - A date string in form MM/DD/YYYY that represents the meeting start date
 * @param end - A date string in form MM/DD/YYYY that represents the meeting end date
 * @returns An array of objects that represent the session attendees
 */
async function getImatMeetingAttendanceSummaryByDate(
	user: User,
	groupName: string,
	start: string,
	end: string
) {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const url = `/${groupName}/attendance-summary.csv?b=${start}&d=${end}`;
	const response = await ieeeClient.getAsBuffer(url);
	if (response.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");

	return parseImatMeetingAttendanceSummary(response.data);
}

/**
 * Get IMAT attendance summary for a session
 * @param user - The user executing the get
 * @param session - The session object with start and end date
 * @returns An array of objects that represent the session attendees
 */
export async function getImatMeetingAttendanceSummaryForSession(
	user: User,
	group: Group,
	session: Session
) {
	const zone = session.timezone;

	let start: DateTime | string;
	start = DateTime.fromISO(session.startDate, { zone });
	if (!start.isValid)
		throw new TypeError(
			`Invalid session start (${session.startDate}) or timezone (${session.timezone})`
		);
	start = start.toFormat("MM/dd/yyyy");

	let end: DateTime | string;
	end = DateTime.fromISO(session.endDate, { zone });
	if (!end.isValid)
		throw new TypeError(
			`Invalid session end (${session.endDate}) or timezone (${session.timezone})`
		);
	end = end.toFormat("MM/dd/yyyy");

	return getImatMeetingAttendanceSummaryByDate(user, group.name, start, end);
}

/**
 * Get IMAT attendance summary for a meeting
 * @param user - The user executing the get
 * @param group - Working group
 * @param imatMeetingId - The IMAT meeting number
 * @returns An array of objects that represents the session attendees
 */
export async function getImatMeetingAttendanceSummary(
	user: User,
	group: Group,
	imatMeetingId: number
): Promise<ImatAttendanceSummary[]> {
	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	const zone = imatMeeting.timezone;

	let start: DateTime | string;
	start = DateTime.fromISO(imatMeeting.start, { zone });
	if (!start.isValid)
		throw new TypeError(
			`Invalid IMAT meeting start (${imatMeeting.start}) or timezone (${imatMeeting.timezone})`
		);
	start = start.toFormat("MM/dd/yyyy");

	let end: DateTime | string;
	end = DateTime.fromISO(imatMeeting.end, { zone });
	if (!end.isValid)
		throw new TypeError(
			`Invalid session end (${imatMeeting.end}) or timezone (${imatMeeting.timezone})`
		);
	end = end.toFormat("MM/dd/yyyy");

	return getImatMeetingAttendanceSummaryByDate(user, group.name, start, end);
}

/*type ImatDailyAttendance = ImatAttendanceSummary & {
	Employer: string;
	ContactInfo: ContactInfo;
};*/

/* The daily attendance spreadsheet has columns:
 * 'SA PIN', ... 'Country'
 * and then one column per session day (e.g., 'Sun', 'Mon', ...)
 * and then 'Total', ..., 'Recorded Percentage'
 */
const dailyAttendanceHeader = [
	"SA PIN",
	"Last Name",
	"First Name",
	"Middle Name",
	"Current Involvement Level",
	"Email",
	"Affiliation",
	"Employer",
	"Street Line 1",
	"Street Line 2",
	"City",
	"State",
	"Zip",
	"Country",
	/* e.g.: 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', */
	"Total",
	"Reciprocal Credits",
	"Calculated Percentage",
	"Recorded Percentage",
] as const;

function validateSpreadsheetColumns(
	row: { [name: string]: string },
	expectedHeader: readonly string[]
) {
	if (!expectedHeader.every((colName) => colName in row)) {
		const headings = Object.keys(row);
		throw new TypeError(
			`Unexpected column headings:\n${headings.join(
				", "
			)}\n\nExpected:\n${expectedHeader.join(", ")}`
		);
	}
}

async function parseImatMeetingDailyAttendance(buffer: Buffer) {
	const p = await csvParse(buffer, {
		columns: true,
		bom: true,
		encoding: "latin1",
	});
	if (p.length === 0) throw new TypeError("Got empty daily-attendance.csv");

	validateSpreadsheetColumns(p[0], dailyAttendanceHeader);

	return p.map((c) => {
		const ContactInfo: ContactInfo = {
			StreetLine1: c["Street Line 1"],
			StreetLine2: c["Street Line 2"],
			City: c["City"],
			State: c["State"],
			Zip: c["Zip"],
			Country: c["Country"],
			Phone: "",
			Fax: "",
		};
		const entry: ImatDailyAttendanceSummary = {
			SAPIN: Number(c["SA PIN"]),
			Name: "",
			LastName: c["Last Name"],
			FirstName: c["First Name"],
			MI: c["Middle Name"],
			Status: c["Current Involvement Level"],
			Email: c["Email"],
			Affiliation: c["Affiliation"],
			Employer: c["Employer"],
			ContactInfo,
			AttendancePercentage: Number(c["Recorded Percentage"]),
		};
		entry.Name = entry.FirstName;
		if (entry.MI) entry.Name += " " + entry.MI;
		entry.Name += " " + entry.LastName;
		return entry;
	});
}

/**
 * Get IMAT meeting daily attendance
 * @param user - The user executing the get
 * @param group - Working group
 * @param imatMeetingId - The IMAT meeting number
 * @returns An array of objects representing the meeting attendees
 */
export async function getImatMeetingDailyAttendance(
	user: User,
	group: Group,
	imatMeetingId: number
): Promise<ImatDailyAttendanceSummary[]> {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const url = `/${group.name}/daily-attendance.csv?p=${imatMeetingId}`;
	const response = await ieeeClient.getAsBuffer(url);
	if (response.headers.get("content-type") !== "text/csv")
		throw new AuthError("Not logged in");

	return parseImatMeetingDailyAttendance(response.data);
}
