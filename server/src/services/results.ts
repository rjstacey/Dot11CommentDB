import { v4 as uuid } from "uuid";

import db from "../utils/database";
import { shallowEqual, AuthError, NotFoundError, isPlainObject } from "../utils";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";
import type { User } from "./users";

import { parseEpollResults, parseEpollResultsHtml } from "./epoll";
import { parseMyProjectResults } from "./myProjectSpreadsheets";
import { genResultsSpreadsheet } from "./resultsSpreadsheet";
import { getBallotSeries, BallotType, Ballot } from "./ballots";
import { AccessLevel } from "../auth/access";
import { type Group } from "./groups";
import { getMember } from "./members";

export type Result = {
	id: string;
	ballot_id: number;
	SAPIN: number;
	Email: string;
	Name: string;
	Affiliation: string;
	Status: string;
	LastBallotId: number;
	LastSAPIN: number;
	Vote: string;
	CommentCount: number;
	TotalCommentCount?: number;
	Notes: string;
};

export type ResultDB = {
	id: string;
} & Pick<Result,
	| "ballot_id"
	| "SAPIN"
	| "Email"
	| "Name"
	| "Affiliation"
	| "Vote"
	| "Notes"
>;

type ResultChange = Partial<Pick<ResultDB, "Vote" | "Notes">>;

type ResultUpdate = {
	id: ResultDB["id"];
	changes: ResultChange;
};

export type ResultsSummary = {
	Approve: number;
	Disapprove: number;
	Abstain: number;
	InvalidVote: number;
	InvalidAbstain: number;
	InvalidDisapprove: number;
	ReturnsPoolSize: number;
	TotalReturns: number;
	BallotReturns: number;
	VotingPoolSize: number;
	Commenters: number;
};

const createViewResultsCurrent = `
	DROP VIEW IF EXISTS resultsCurrent;
	CREATE VIEW resultsCurrent AS
	WITH membersCurrent AS (
		SELECT
			SAPIN, SAPIN as CurrentSAPIN, Name, Email, Affiliation, Status, groupId
		FROM members WHERE Status<>'Obsolete'
		UNION ALL
		SELECT
			m1.SAPIN, m1.ReplacedBySAPIN as CurrentSAPIN, m2.Name, m2.Email, m2.Affiliation, m2.Status, m2.groupId
		FROM members m1
			LEFT JOIN members m2 ON m1.groupId=m2.groupId AND m2.SAPIN=m1.ReplacedBySAPIN
		WHERE m1.Status='Obsolete'
	)
	SELECT
		r.id,
		r.SAPIN,
		m.CurrentSAPIN,
		COALESCE(m.Name, r.Name) AS Name,
		COALESCE(m.Email, r.Email) AS Email,
		COALESCE(m.Affiliation, r.Affiliation) AS Affiliation,
		r.Vote,
		COALESCE(c1.CommentCount, c2.CommentCount, c3.CommentCount, 0) AS CommentCount,
		r.Notes,
		r.ballot_id,
		m.groupId
	FROM results r
		JOIN ballots b ON b.id=r.ballot_id
		LEFT JOIN (SELECT COUNT(*) AS CommentCount, ballot_id, CommenterSAPIN FROM comments WHERE CommenterSAPIN>0 GROUP BY ballot_id, CommenterSAPIN) c1 ON c1.ballot_id=r.ballot_id AND c1.CommenterSAPIN=r.SAPIN
		LEFT JOIN (SELECT COUNT(*) AS CommentCount, ballot_id, CommenterEmail FROM comments WHERE CommenterEmail<>"" GROUP BY ballot_id, CommenterEmail) c2 ON c2.ballot_id=r.ballot_id AND c2.CommenterEmail=r.Email
		LEFT JOIN (SELECT COUNT(*) AS CommentCount, ballot_id, CommenterName FROM comments GROUP BY ballot_id, CommenterName) c3 ON c3.ballot_id=r.ballot_id AND c3.CommenterName=r.Name
		LEFT JOIN membersCurrent m ON r.SAPIN=m.SAPIN AND b.workingGroupId=m.groupId;
`;

export function init() {
	return db.query(createViewResultsCurrent);
}

const zeroResultsSummary: ResultsSummary = {
	Approve: 0,
	Disapprove: 0,
	Abstain: 0,
	InvalidVote: 0,
	InvalidAbstain: 0,
	InvalidDisapprove: 0,
	ReturnsPoolSize: 0,
	TotalReturns: 0,
	BallotReturns: 0,
	VotingPoolSize: 0,
	Commenters: 0,
}

function summarizeWGResults(results: Result[]): ResultsSummary {

	let summary = {...zeroResultsSummary};

	for (let r of results) {
		if (/^Voter|^ExOfficio/.test(r.Status)) {
			if (/^Approve/.test(r.Vote)) summary.Approve++;
			else if (/^Disapprove/.test(r.Vote)) {
				if (r.CommentCount) summary.Disapprove++;
				else summary.InvalidDisapprove++;
			} else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++;
			} else if (/^Abstain/.test(r.Vote)) {
				summary.InvalidAbstain++;
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a valid vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++;
			} else if (
				/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain.*expertise/.test(r.Vote)
			) {
				summary.ReturnsPoolSize++;
			}
			summary.VotingPoolSize++;
		}
		else {
			summary.InvalidVote++;
		}

		if (!/None/.test(r.Vote)) {
			summary.BallotReturns++;
		}

		if (r.TotalCommentCount) summary.Commenters++;
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function summarizeSAResults(results: Result[]) {

	let summary = {...zeroResultsSummary};

	results.forEach((r) => {
		if (/^Approve/.test(r.Vote)) {
			summary.Approve++;
		} else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount) summary.Disapprove++;
			else summary.InvalidDisapprove++;
		} else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++;
		}

		if (r.CommentCount) summary.Commenters++;
	});

	summary.BallotReturns = results.length;
	summary.ReturnsPoolSize = results.length;
	summary.VotingPoolSize = results.length;

	summary.TotalReturns =
		summary.Approve +
		summary.Disapprove +
		summary.InvalidDisapprove +
		summary.Abstain;

	return summary;
}


function summarizeCCResults(results: Result[]) {

	let summary = { ...zeroResultsSummary };
	
	results.forEach((r) => {
		if (/^Approve/.test(r.Vote)) summary.Approve++;
		else if (/^Disapprove/.test(r.Vote)) summary.Disapprove++;
		else if (/^Abstain/.test(r.Vote)) summary.Abstain++;

		// Count the number of commenters
		if (r.CommentCount) summary.Commenters++;
	});

	summary.TotalReturns =
		summary.Approve +
		summary.Disapprove +
		summary.Abstain;

	summary.BallotReturns = results.length;

	return summary;
}

export type ResultsCoalesced = {
	ballot: Ballot;
	results: Result[];
};

function getWGResultsCoalesced(ballot: Ballot): Promise<Result[]> {

	const sql = `
		WITH resultsColated AS (
			SELECT
				*
			FROM (
				SELECT
					b.ballot_id,
					b.initial_id as InitialBallotId,
					r.CurrentSAPIN as SAPIN,
					LAST_VALUE(r.ballot_id) OVER w AS LastBallotId,
					LAST_VALUE(r.SAPIN) OVER w AS LastSAPIN,
					LAST_VALUE(r.Vote) OVER w AS Vote,
					LAST_VALUE(r.CommentCount) OVER w AS CommentCount,
					SUM(r.CommentCount) OVER w AS TotalCommentCount,
					LAST_VALUE(r.Notes) OVER w AS Notes
				FROM resultsCurrent r
					JOIN ballotSeries b ON r.ballot_id=b.id
				WHERE b.ballot_id=${ballot.id}
				WINDOW w AS (PARTITION BY r.CurrentSAPIN)
			) AS t
			GROUP BY InitialBallotId, SAPIN, LastBallotId, LastSAPIN, Vote, CommentCount, TotalCommentCount, Notes
		), resultsCoalesced AS (
			SELECT
				CONCAT(t1.ballot_id, "-", t1.SAPIN) AS id,
				t1.ballot_id,
				t1.InitialBallotId,
				t1.SAPIN,
				m.Name, m.Email, m.Affiliation,
				COALESCE(v.Status, "Non-Voter") as Status,
				t1.LastBallotId,
				t1.LastSAPIN,
				t1.Vote,
				t1.CommentCount,
				t1.TotalCommentCount,
				t1.Notes
			FROM resultsColated t1
				LEFT JOIN votersCurrent v ON t1.InitialBallotId=v.ballot_id AND t1.SAPIN=v.CurrentSAPIN
				LEFT JOIN members m ON m.SAPIN=t1.SAPIN
			UNION ALL
			SELECT
				CONCAT(${ballot.id}, "-", v.CurrentSAPIN) AS id,
				${ballot.id} as ballot_id,
				v.ballot_id as InitialBallotId,
				v.CurrentSAPIN as SAPIN,
				m.Name, m.Email, m.Affiliation,
				v.Status,
				NULL as LastBallotId,
				v.SAPIN as LastSAPIN,
				"None" as Vote,
				0 AS CommentCount,
				0 AS TotalCommentCount,
				NULL as Notes
			FROM (SELECT v.* FROM votersCurrent v LEFT JOIN ballotSeries b ON b.initial_id=v.ballot_id AND b.prev_id IS NULL WHERE b.ballot_id=${ballot.id}) v
				LEFT JOIN resultsColated t1 ON t1.InitialBallotId=v.ballot_id AND t1.SAPIN=v.CurrentSAPIN
				LEFT JOIN members m ON m.SAPIN=v.CurrentSAPIN
			WHERE t1.SAPIN IS NULL
		)
		SELECT * from resultsCoalesced ORDER BY SAPIN;
	`;

	return db.query<(Result & RowDataPacket)[]>(sql);
}

function getCCResultsCoalesced(ballot: Ballot): Promise<Result[]> {

	const sql = `
		SELECT
			BIN_TO_UUID(id) AS id,
			ballot_id,
			CurrentSAPIN AS SAPIN,
			Email,
			Name,
			Affiliation,
			NULL AS Status,
			ballot_id AS LastBallotId,
			SAPIN AS LastSAPIN,
			Vote,
			CommentCount,
			CommentCount AS TotalCommentCount,
			Notes
		FROM resultsCurrent
		WHERE ballot_id=${ballot.id}
	`;

	return db.query<(Result & RowDataPacket)[]>(sql);
}

function getSAResultsCoalesced(ballot: Ballot): Promise<Result[]> {

	const sql = `
		SELECT
			CONCAT(ballot_id, "-", Email) id,
			t.*,
			NULL AS Status
		FROM (
			SELECT
				b.ballot_id,
				b.initial_id as InitialBallotId,
				r.Email,
				LAST_VALUE(r.Name) OVER w AS Name,
				LAST_VALUE(r.Affiliation) OVER w AS Affiliation,
				LAST_VALUE(r.ballot_id) OVER w AS LastBallotId,
				LAST_VALUE(r.Vote) OVER w AS Vote,
				LAST_VALUE(r.CommentCount) OVER w AS CommentCount,
				SUM(r.CommentCount) OVER w AS TotalCommentCount,
				LAST_VALUE(r.Notes) OVER w AS Notes
			FROM resultsCurrent r
				JOIN ballotSeries b ON r.ballot_id=b.id
			WHERE b.ballot_id=${ballot.id}
			WINDOW w AS (PARTITION BY r.Email)
		) AS t
		GROUP BY InitialBallotId, Email, Name, Affiliation, LastBallotId, Vote, CommentCount, TotalCommentCount, Notes
	`;

	return db.query<(Result & RowDataPacket)[]>(sql);
}


export async function getResultsCoalesced(
	user: User,
	access: number,
	workingGroupId: string,
	ballot: Ballot
): Promise<ResultsCoalesced> {

	let results: Result[],
		summary: ResultsSummary;

	if (ballot.Type === BallotType.CC) {
		results = await getCCResultsCoalesced(ballot);
		summary = summarizeCCResults(results);
	}
	else if (ballot.Type === BallotType.WG) {
		results = await getWGResultsCoalesced(ballot);
		summary = summarizeWGResults(results);
	}
	else if (ballot.Type === BallotType.SA) {
		results = await getSAResultsCoalesced(ballot);
		summary = summarizeSAResults(results);
	}
	else {
		results = [];
		summary = zeroResultsSummary;
	}

	/* Update results summary in ballots table if different */
	if (!ballot.Results || !shallowEqual(summary, ballot.Results)) {
		await db.query("UPDATE ballots SET ResultsSummary=? WHERE id=?", [
			JSON.stringify(summary),
			ballot.id,
		]);
		ballot = { ...ballot, Results: summary };
	}

	return {
		ballot,
		results,
	};
}

export function getWGResults(ballot_id: number): Promise<Result[]> {
	const e_ballot_id = db.escape(ballot_id);
	// prettier-ignore
	const sql = `
		SELECT
			BIN_TO_UUID(r.id) AS id,
			r.ballot_id,
			r.SAPIN,
			r.Email,
			r.Name,
			r.Affiliation,
			r.ballot_id AS LastBallotId,
			r.SAPIN AS LastSAPIN,
			r.Vote,
			r.CommentCount,
			r.Notes
		FROM resultsCurrent r
		WHERE r.ballot_id=${e_ballot_id}
	`;

	return db.query<(RowDataPacket & Result)[]>(sql);
}

function validResultChange(changes: any): changes is ResultChange {
	return (
		isPlainObject(changes) &&
		(typeof changes.Vote === "undefined" || typeof changes.Vote === "string") &&
		(typeof changes.Notes === "undefined" || typeof changes.Notes === "string")
	);
}

function validResultUpdate(update: any): update is ResultUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === "string" &&
		validResultChange(update.changes)
	);
}

export function validResultUpdates(updates: any): updates is ResultUpdate[] {
	return Array.isArray(updates) && updates.every(validResultUpdate);
}

async function updateResult(workingGroupId: string, ballot: Ballot, {id, changes}: ResultUpdate) {
	if (ballot.Type === BallotType.WG) {
		const m = id.match(/(\d+)-(\d+)/);	// id has format "{ballot_id}-{SAPIN}"
		if (!m)
			throw new TypeError(`Invalid id=${id}; expected format "{ballot_id}-{SAPIN}"`);
		const ballot_id=Number(m[1]);
		if (ballot_id !== ballot.id)
			throw new TypeError(`Invalid id=${id}; first number must match ballot_id=${ballot.id}`);
		const sapin = Number(m[2]);
		const result = await db.query<ResultSetHeader>("UPDATE results SET ? WHERE ballot_id=? AND SAPIN=?", [changes, ballot.id, sapin]);
		if (result.affectedRows === 0) {
			const member = await getMember(AccessLevel.admin, workingGroupId, sapin);
			if (!member)
				throw new TypeError(`Invalid SAPIN=${sapin}; not a member`);
			const sql = `
				INSERT INTO results
				SET
					ballot_id=${ballot.id},
					SAPIN=${db.escape(sapin)},
					Name=${db.escape(member.Name)},
					Email=${db.escape(member.Email)},
					Affiliation=${db.escape(member.Affiliation)},
					Vote=${db.escape(changes.Vote || "None")},
					Notes=${db.escape(changes.Notes || "")}
			`;
			await db.query(sql);
		}
	}
	else {
		await db.query("UPDATE results SET ? WHERE ballot_id=? AND id=UUID_TO_BIN(?)", [changes, ballot.id, id]);
	}
}

export async function updateResults(user: User, access: number, workingGroupId: string, ballot: Ballot, updates: ResultUpdate[]) {
	const results = updates.map(update => updateResult(workingGroupId, ballot, update));
	console.log(await Promise.all(results));
	return getResultsCoalesced(user, access, workingGroupId, ballot);
}

export async function deleteResults(ballot_id: number) {
	const e_ballot_id = db.escape(ballot_id);
	const sql =
		`DELETE FROM results WHERE ballot_id=${e_ballot_id}; ` +
		`UPDATE ballots SET ResultsSummary=NULL WHERE id=${e_ballot_id};`;
	const results = await db.query<ResultSetHeader[]>(sql);
	return results[0].affectedRows;
}

async function insertResults(
	user: User,
	access: number,
	workingGroupId: string,
	ballot: Ballot,
	results: Partial<Result>[]
) {
	let sql = db.format("DELETE FROM results WHERE ballot_id=?;", ballot.id);
	if (results.length) {
		sql +=
			`INSERT INTO results (ballot_id, ${Object.keys(
				results[0]
			)}) VALUES` +
			results
				.map((c) => `(${ballot.id}, ${db.escape(Object.values(c))})`)
				.join(",") +
			";";
	}
	await db.query(sql);
	return getResultsCoalesced(user, access, workingGroupId, ballot);
}

export async function importEpollResults(user: User, workingGroup: Group, ballot: Ballot) {
	if (!ballot.EpollNum)
		throw new TypeError("Ballot does not have an ePoll number");

	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const p1 = ieeeClient.get(
		`https://mentor.ieee.org/${workingGroup.name}/poll-results.csv?p=${ballot.EpollNum}`
	);
	const p2 = ieeeClient.get(
		`https://mentor.ieee.org/${workingGroup.name}/poll-status?p=${ballot.EpollNum}`
	);

	let response = await p1;
	if (response.headers["content-type"] !== "text/csv")
		throw new Error("Not logged in");
	const file = { originalname: "poll-results.csv", buffer: response.data };
	var pollResults = await parseEpollResults(file);

	response = await p2;
	var pollResults2 = parseEpollResultsHtml(response.data);

	// Update poll results with Name and Affiliation from HTML (not present in .csv)
	const results: Omit<
		ResultDB,
		| "id"
		| "ballot_id"
		| "Notes"
	>[] = pollResults.map((r) => {
		const h = pollResults2.find((h) => h.Email === r.Email);
		return {
			...r,
			Name: h ? h.Name : "",
			Affiliation: h ? h.Affiliation : "",
		};
	});

	return insertResults(user, AccessLevel.admin, workingGroup.id, ballot, results);
}

/**
 * Upload results from spreadsheet.
 *
 * The expected spreadsheet format depends on the ballot type.
 * For SA ballot, the MyProject spreadsheet format is expected.
 * For WG ballot, the ePoll .xlsx or .csv format is expected.
 */
export async function uploadResults(
	user: User,
	workingGroupId: string,
	ballot: Ballot,
	file: Express.Multer.File
) {
	let results: Partial<ResultDB>[];
	if (ballot.Type === BallotType.SA) {
		results = await parseMyProjectResults(file);
	} else {
		results = await parseEpollResults(file);
	}
	return insertResults(user, AccessLevel.admin, workingGroupId, ballot, results);
}

export const sanitize = (name: string) =>
	name.slice(0, 30).replace(/[*.\?:\\\/\[\]]/g, "_");

export async function exportResults(
	user: User,
	access: number,
	workingGroupId: string,
	ballot: Ballot,
	forBallotSeries: boolean,
	res: Response
) {
	let results: ResultsCoalesced[];
	if (forBallotSeries) {
		let ballots = await getBallotSeries(ballot.id);
		if (ballots.length === 0)
			throw new NotFoundError(`No such ballot: ${ballot.id}`);
		results = await Promise.all(
			ballots.map((b) => getResultsCoalesced(user, access, workingGroupId, b))
		);
		res.attachment(sanitize(ballots[0].Project) + "_results.xlsx");
	} else {
		const result = await getResultsCoalesced(user, access, workingGroupId, ballot);
		results = [result];
		res.attachment(sanitize(ballot.BallotID) + "_results.xlsx");
	}
	return genResultsSpreadsheet(user, results, res);
}
