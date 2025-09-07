/*
 * ePoll HTML scraping
 */

import { DateTime } from "luxon";
import { load as cheerioLoad } from "cheerio";
import { AuthError, parseSpreadsheet, BasicFile } from "../utils/index.js";

import type { User } from "./users.js";
import { Epoll } from "@schemas/epolls.js";

// Convert date string to UTC
function parseDateTime(dateStr: string) {
	// Date is in format: "11-Dec-2018 23:59:59 ET" and is always eastern time
	dateStr = dateStr.slice(0, 20);
	return (
		DateTime.fromFormat(dateStr, "dd-MMM-yyyy HH:mm:ss", {
			zone: "America/New_York",
		}).toISO() || ""
	);
}

function parseClosedEpollsPage(body: string): Epoll[] {
	const epolls: Epoll[] = [];
	const $ = cheerioLoad(body);

	// If we get the "ePolls" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($("div.title").length && $("div.title").html() == "ePolls") {
		//console.log('GOT ePolls page');
		$(".b_data_row").each(function () {
			// each table data row
			const tds = $(this).find("td");
			const pollStatusLink = tds.eq(7).html() || "";
			const p = pollStatusLink.match(/poll-status\?p=(\d+)/);
			const epoll: Epoll = {
				id: p ? parseInt(p[1]) : 0,
				start: parseDateTime($(tds.eq(0)).children().eq(0).text()), // <div class="date_time">
				name: tds.eq(1).text(),
				topic: $(tds.eq(2)).children().eq(0).text(), // <p class="prose">
				document: $(tds.eq(3)).children().eq(0).text(),
				end: parseDateTime($(tds.eq(4)).children().eq(0).text()), // <div class="date_time">
				resultsSummary: tds.eq(5).text(),
			};
			epolls.push(epoll);
		});
		return epolls;
	} else if ($("div.title").length && $("div.title").html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError("Not logged in");
	} else {
		throw new Error("Unexpected page returned by mentor.ieee.org");
	}
}

/**
 * Get ePolls
 *
 * Parameters: n = number of entries to get
 */
export async function getEpolls(
	user: User,
	groupName: string,
	n: number
): Promise<Epoll[]> {
	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	async function recursivePageGet(epolls: Epoll[], n: number, page: number) {
		console.log("get epolls n=", n);

		const url = `https://mentor.ieee.org/${groupName}/polls/closed?n=${page}`;
		const { data } = await ieeeClient!.get(url);
		console.log(data.slice(0, 100));

		const epollsPage = parseClosedEpollsPage(data);
		let end = n - epolls.length;
		if (end > epollsPage.length) {
			end = epollsPage.length;
		}
		epolls = epolls.concat(epollsPage.slice(0, end));

		if (epolls.length === n || epollsPage.length === 0) {
			//console.log('send ', epolls.length);
			return epolls;
		}

		return recursivePageGet(epolls, n, page + 1);
	}

	return recursivePageGet([], n, 1);
}

type PageResult = {
	Vote: string;
	Name: string;
	Email: string;
	Affiliation: string;
};

export function parseEpollResultsHtml(body: string) {
	const $ = cheerioLoad(body);
	// If we get the "ePoll Status" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($("div.title").length && $("div.title").html() == "ePoll Status") {
		const results: PageResult[] = [];
		$("table.paged_list")
			.eq(0)
			.find("tr.b_data_row")
			.each(function () {
				const tds = $(this).find("td");
				const emailLink =
					$(tds.eq(2)).children().eq(0).attr("href") || "";
				const result = {
					Vote: tds.eq(1).text(),
					Name: tds.eq(2).text(),
					Email: unescape(emailLink.replace("mailto:", "")),
					Affiliation: tds.eq(3).text(),
				};
				//console.log(result)
				results.push(result);
			});
		return results;
	} else if ($("div.title").length && $("div.title").html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new Error("Not logged in");
	} else {
		throw new Error("Unexpected page returned by mentor.ieee.org");
	}
}

const epollCommentsHeader = [
	"Index",
	"Date",
	"SA PIN",
	"Name",
	"Comment",
	"Category",
	"Page Number",
	"Subclause",
	"Line Number",
	"Proposed Change", //, 'Must Be Satisfied'
];

type EpollComment = {
	CommentID: number;
	C_Index: number;
	CommenterSAPIN: number;
	CommenterName: string;
	Comment: string;
	Category: "T" | "G" | "E";
	C_Page: string;
	C_Clause: string;
	C_Line: string;
	Page: number;
	Clause: string;
	ProposedChange: string;
	MustSatisfy: boolean;
};

function parseEpollComment(cid: number, c: string[]): EpollComment | null {
	const C_Index = parseInt(c[0]);
	if (isNaN(C_Index)) return null;
	const C_Page = c[6] ? c[6].trim() : "";
	const C_Line = c[8] ? c[8].trim() : "";
	let Page = parseFloat(C_Page) + parseFloat(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const cat = c[5].charAt(0);
	const Category = cat === "T" || cat == "E" || cat === "G" ? cat : "T"; // First letter only (G, T or E), T if blank

	const Clause = (c[7] || "").trim();

	const comment: EpollComment = {
		CommentID: cid,
		C_Index,
		CommenterSAPIN: Number(c[2]),
		CommenterName: c[3],
		Comment: c[4],
		Category,
		C_Page,
		C_Clause: Clause,
		C_Line,
		Page,
		Clause,
		ProposedChange: c[9] || "",
		MustSatisfy: c[10] === "1",
	};
	return comment;
}

export async function parseEpollComments(
	startCommentId: number,
	file: { originalname: string; buffer: Buffer }
): Promise<EpollComment[]> {
	const rows = await parseSpreadsheet(
		file,
		epollCommentsHeader,
		0,
		epollCommentsHeader.length + 2
	);

	const comments: EpollComment[] = [];
	let cid = startCommentId;
	for (const c of rows) {
		const comment = parseEpollComment(cid++, c);
		if (comment) comments.push(comment);
	}

	return comments;
}

const epollUserCommentsHeader = [
	"Comment",
	"Category",
	"Page Number",
	"Subclause",
	"Line Number",
	"Proposed Change",
	"Must Be Satisfied",
];

function parseUserComment(
	user: User,
	CommentID: number,
	C_Index: number,
	c: string[]
): EpollComment {
	const C_Page = c[2] ? c[2].trim() : "";
	const C_Line = c[4] ? c[4].trim() : "";
	let Page = parseFloat(C_Page) + parseFloat(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const cat = c[1].charAt(0);
	const Category = cat === "T" || cat == "E" || cat === "G" ? cat : "T"; // First letter only (G, T or E), T if blank

	const Clause = (c[3] || "").trim();

	const MustSatisfy = (c[6] || "").toLowerCase() === "yes";

	return {
		CommentID,
		C_Index,
		CommenterSAPIN: user.SAPIN,
		CommenterName: user.Name,
		Comment: c[0],
		Category,
		C_Page,
		C_Clause: Clause,
		C_Line,
		Page,
		Clause,
		ProposedChange: c[5] || "",
		MustSatisfy,
	} satisfies EpollComment;
}

export async function parseEpollUserComments(
	user: User,
	startCommentId: number,
	startIndex: number,
	file: BasicFile
): Promise<EpollComment[]> {
	const rows = await parseSpreadsheet(file, epollUserCommentsHeader, 3);

	return rows.map((row, index) =>
		parseUserComment(user, startCommentId + index, startIndex + index, row)
	);
}

const epollResultsHeader = ["SA PIN", "Date", "Vote", "Email"];

type EpollResult = {
	SAPIN: number;
	Email: string;
	Vote: string;
};

export async function parseEpollResults(
	file: BasicFile
): Promise<EpollResult[]> {
	const rows = await parseSpreadsheet(file, epollResultsHeader);

	return rows.map((c) => ({
		SAPIN: Number(c[0]),
		//Date: c[1],
		Vote: c[2],
		Email: c[3],
	}));
}
