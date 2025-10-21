import db from "../utils/database.js";
import { shallowEqual, AuthError, NotFoundError } from "../utils/index.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";
import type { User } from "./users.js";

import { parseEpollResults, parseEpollResultsHtml } from "./epoll.js";
import { parseMyProjectResults } from "./myProjectSpreadsheets.js";
import { genResultsSpreadsheet } from "./resultsSpreadsheet.js";
import { getBallotSeries, BallotType } from "./ballots.js";
import { getMember } from "./members.js";
import type { Group } from "@schemas/groups.js";
import type { Result, ResultUpdate } from "@schemas/results.js";
import type { Ballot, ResultsSummary } from "@schemas/ballots.js";

export type ResultDB = {
	id: string;
	Vote: Result["vote"];
	Notes: Result["notes"];
} & Pick<Result, "ballot_id" | "SAPIN" | "Email" | "Name" | "Affiliation">;

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
		COALESCE(m.CurrentSAPIN, r.SAPIN) AS CurrentSAPIN,
		COALESCE(m.Name, r.Name) AS Name,
		COALESCE(m.Email, r.Email) AS Email,
		COALESCE(m.Affiliation, r.Affiliation) AS Affiliation,
		r.ballot_id,
		r.Vote AS vote,
		COALESCE(c1.commentCount, c2.commentCount, c3.commentCount, 0) AS commentCount,
		r.Notes AS notes
	FROM results r JOIN ballots b ON b.id=r.ballot_id
		LEFT JOIN membersCurrent m ON r.SAPIN=m.SAPIN AND b.workingGroupId=m.groupId
		LEFT JOIN (SELECT COUNT(*) AS commentCount, ballot_id, CommenterSAPIN FROM comments WHERE CommenterSAPIN>0 GROUP BY ballot_id, CommenterSAPIN) c1 ON c1.ballot_id=r.ballot_id AND c1.CommenterSAPIN=r.SAPIN
		LEFT JOIN (SELECT COUNT(*) AS commentCount, ballot_id, CommenterEmail FROM comments WHERE CommenterEmail<>"" GROUP BY ballot_id, CommenterEmail) c2 ON c2.ballot_id=r.ballot_id AND c2.CommenterEmail=r.Email
		LEFT JOIN (SELECT COUNT(*) AS commentCount, ballot_id, CommenterName FROM comments GROUP BY ballot_id, CommenterName) c3 ON c3.ballot_id=r.ballot_id AND c3.CommenterName=r.Name;
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
};

function summarizeWGResults(results: Result[]): ResultsSummary {
	const summary = { ...zeroResultsSummary };

	for (const r of results) {
		if (/^Voter|^ExOfficio/.test(r.Status || "")) {
			if (/^Approve/.test(r.vote)) summary.Approve++;
			else if (/^Disapprove/.test(r.vote)) {
				if (r.commentCount) summary.Disapprove++;
				else summary.InvalidDisapprove++;
			} else if (/^Abstain.*expertise/.test(r.vote)) {
				summary.Abstain++;
			} else if (/^Abstain/.test(r.vote)) {
				summary.InvalidAbstain++;
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a valid vote count torward the returns pool
			if (/^Voter/.test(r.Status || "")) {
				summary.ReturnsPoolSize++;
			} else if (
				/^Approve/.test(r.vote) ||
				(/^Disapprove/.test(r.vote) && r.commentCount) ||
				/^Abstain.*expertise/.test(r.vote)
			) {
				summary.ReturnsPoolSize++;
			}
			summary.VotingPoolSize = summary.VotingPoolSize
				? summary.VotingPoolSize + 1
				: 1;
		} else {
			summary.InvalidVote++;
		}

		if (!/None/.test(r.vote)) {
			summary.BallotReturns++;
		}

		if (r.totalCommentCount) {
			summary.Commenters = summary.Commenters
				? summary.Commenters + 1
				: 1;
		}
	}
	summary.TotalReturns =
		summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function summarizeSAResults(results: Result[]) {
	const summary = { ...zeroResultsSummary };

	results.forEach((r) => {
		if (/^Approve/.test(r.vote)) {
			summary.Approve++;
		} else if (/^Disapprove/.test(r.vote)) {
			if (r.totalCommentCount) summary.Disapprove++;
			else summary.InvalidDisapprove++;
		} else if (/^Abstain/.test(r.vote)) {
			summary.Abstain++;
		}

		if (r.commentCount) {
			summary.Commenters = summary.Commenters
				? summary.Commenters + 1
				: 1;
		}
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
	const summary = { ...zeroResultsSummary };

	results.forEach((r) => {
		if (/^Approve/.test(r.vote)) summary.Approve++;
		else if (/^Disapprove/.test(r.vote)) summary.Disapprove++;
		else if (/^Abstain/.test(r.vote)) summary.Abstain++;

		// Count the number of commenters
		if (r.commentCount) {
			summary.Commenters = summary.Commenters
				? summary.Commenters + 1
				: 1;
		}
	});

	summary.TotalReturns =
		summary.Approve + summary.Disapprove + summary.Abstain;

	summary.BallotReturns = results.length;

	return summary;
}

function getCCResults(ballot_id: number): Promise<Result[]> {
	const sql = `
		SELECT
			BIN_TO_UUID(id) AS id,
			ballot_id,
			CurrentSAPIN AS SAPIN,
			Email,
			Name,
			Affiliation,
			NULL AS Status,
			ballot_id AS lastBallotId,
			SAPIN AS lastSAPIN,
			vote,
			commentCount,
			commentCount AS totalCommentCount,
			notes
		FROM resultsCurrent
		WHERE ballot_id=${ballot_id}
	`;

	return db.query<(RowDataPacket & Result)[]>(sql);
}

export async function getWGBallotResults(ballot_id: number): Promise<Result[]> {
	/* The resultsForSeries table gets the most recent result for each member that returned
	 * a ballot (including those not in the pool).
	 * The votersForSeries table gets all the voters for the ballot series.
	 * The resultsPlusVoters table has the last result for the voters that did vote plus
	 * the voters that did not vote.
	 */
	const sql = `
		WITH resultsForSeries AS (
			SELECT *
			FROM (
				SELECT
					b.id,
					b.series_id,
					r.CurrentSAPIN,
					LAST_VALUE(r.ballot_id) OVER w AS lastBallotId,
					LAST_VALUE(r.SAPIN) OVER w AS lastSAPIN,
					LAST_VALUE(r.vote) OVER w AS vote,
					LAST_VALUE(r.commentCount) OVER w AS commentCount,
					SUM(r.commentCount) OVER (PARTITION BY b.series_id, r.CurrentSAPIN) AS totalCommentCount,
					LAST_VALUE(r.notes) OVER w AS notes,
					LAST_VALUE(r.Name) OVER w AS Name,
					LAST_VALUE(r.Email) OVER w AS Email,
					LAST_VALUE(r.Affiliation) OVER w AS Affiliation,
					ROW_NUMBER() OVER w AS n
				FROM resultsCurrent r JOIN ballotsSeries b ON b.id=r.ballot_id
				WHERE b.series_id=${ballot_id}
				WINDOW w AS (PARTITION BY b.series_id, r.CurrentSAPIN ORDER BY b.Start DESC)
			) t
			WHERE n=1
		),
		votersForSeries AS (
			SELECT v.*
			FROM votersCurrent v JOIN ballotsSeries b ON b.id=v.ballot_id
			WHERE b.series_id=${ballot_id} AND b.prev_id IS NULL
		),
		resultsPlusVoters AS (
			SELECT
				CONCAT(${ballot_id}, "-", r.CurrentSAPIN) AS id,
				${ballot_id} AS ballot_id,
				r.CurrentSAPIN AS SAPIN,
				COALESCE(v.Status, "Non-Voter") as Status,
				r.lastBallotId,
				r.lastSAPIN,
				r.vote,
				r.commentCount,
				r.totalCommentCount,
				r.notes AS notes,
				r.Name, r.Email, r.Affiliation
			FROM resultsForSeries r	LEFT JOIN votersForSeries v ON r.CurrentSAPIN=v.CurrentSAPIN
			UNION ALL
			SELECT
				CONCAT(${ballot_id}, "-", v.CurrentSAPIN) AS id,
				${ballot_id} AS ballot_id,
				v.CurrentSAPIN AS SAPIN,
				v.Status,
				NULL as lastBallotId,
				v.SAPIN as lastSAPIN,
				"None" as vote,
				0 AS commentCount,
				0 AS totalCommentCount,
				NULL as Notes,
				m.Name, m.Email, m.Affiliation
			FROM votersForSeries v LEFT JOIN members m ON m.SAPIN=v.CurrentSAPIN LEFT JOIN resultsForSeries r ON r.CurrentSAPIN=v.CurrentSAPIN
			WHERE r.CurrentSAPIN IS NULL
		)
		SELECT t.*
		FROM resultsPlusVoters t 
		ORDER BY SAPIN;
	`;

	return db.query<(RowDataPacket & Result)[]>(sql);
}

function getSABallotResults(ballot_id: number): Promise<Result[]> {
	const sql = `
		SELECT
			CONCAT(ballot_id, "-", Email) id,
			t.*,
			NULL AS Status
		FROM (
			SELECT
				b.series_id as ballot_id,
				b.id AS bid,
				r.Email,
				LAST_VALUE(r.Name) OVER w AS Name,
				LAST_VALUE(r.Affiliation) OVER w AS Affiliation,
				LAST_VALUE(r.ballot_id) OVER w AS lastBallotId,
				LAST_VALUE(r.vote) OVER w AS vote,
				LAST_VALUE(r.commentCount) OVER w AS commentCount,
				SUM(r.commentCount) OVER (PARTITION BY b.series_id, r.Email) AS totalCommentCount,
				LAST_VALUE(r.notes) OVER w AS notes,
				ROW_NUMBER() OVER w AS n
			FROM resultsCurrent r JOIN ballotsSeries b ON b.id=r.ballot_id
			WHERE b.series_id=${ballot_id}
			WINDOW w AS (PARTITION BY b.series_id, r.Email ORDER BY b.Start DESC)
		) AS t
		WHERE bid=${ballot_id}
	`;

	return db.query<(RowDataPacket & Result)[]>(sql);
}

export type ResultsCoalesced = {
	ballot: Ballot;
	results: Result[];
};

export async function getResultsCoalesced(ballot: Ballot): Promise<Result[]> {
	let results: Result[], summary: ResultsSummary;

	if (ballot.Type === BallotType.CC) {
		results = await getCCResults(ballot.id);
		summary = summarizeCCResults(results);
	} else if (ballot.Type === BallotType.WG) {
		results = await getWGBallotResults(ballot.id);
		summary = summarizeWGResults(results);
	} else if (ballot.Type === BallotType.SA) {
		results = await getSABallotResults(ballot.id);
		summary = summarizeSAResults(results);
	} else {
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

	return results;
}

export async function getResults(ballot: Ballot) {
	const results = await getResultsCoalesced(ballot);
	const ballots = await getBallotSeries(ballot.id);
	return { ballots, results };
}

async function updateResult(
	workingGroupId: string,
	ballot: Ballot,
	{ id, changes }: ResultUpdate
) {
	if (ballot.Type === BallotType.WG) {
		const m = id.match(/(\d+)-(\d+)/); // id has format "{ballot_id}-{SAPIN}"
		if (!m)
			throw new TypeError(
				`Invalid id=${id}; expected format "{ballot_id}-{SAPIN}"`
			);
		const ballot_id = Number(m[1]);
		if (ballot_id !== ballot.id)
			throw new TypeError(
				`Invalid id=${id}; first number must match ballot_id=${ballot.id}`
			);
		const sapin = Number(m[2]);
		const result = await db.query<ResultSetHeader>(
			"UPDATE results SET ? WHERE ballot_id=? AND SAPIN=?",
			[changes, ballot.id, sapin]
		);
		if (result.affectedRows === 0) {
			const member = await getMember(workingGroupId, sapin);
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
					Vote=${db.escape(changes.vote || "None")},
					Notes=${db.escape(changes.notes || "")}
			`;
			await db.query(sql);
		}
	} else {
		await db.query(
			"UPDATE results SET ? WHERE ballot_id=? AND id=UUID_TO_BIN(?)",
			[changes, ballot.id, id]
		);
	}
}

export async function updateResults(
	workingGroupId: string,
	ballot: Ballot,
	updates: ResultUpdate[]
) {
	await Promise.all(
		updates.map((update) => updateResult(workingGroupId, ballot, update))
	);
	return getResults(ballot);
}

export async function deleteResults(ballot_id: number) {
	const e_ballot_id = db.escape(ballot_id);
	const sql =
		`DELETE FROM results WHERE ballot_id=${e_ballot_id}; ` +
		`UPDATE ballots SET ResultsSummary=NULL WHERE id=${e_ballot_id};`;
	const results = await db.query<ResultSetHeader[]>(sql);
	return results[0].affectedRows;
}

async function insertResults(ballot: Ballot, results: Partial<Result>[]) {
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
	return getResults(ballot);
}

export async function importEpollResults(
	user: User,
	workingGroup: Group,
	ballot: Ballot
) {
	if (!ballot.EpollNum)
		throw new TypeError("Ballot does not have an ePoll number");

	const { ieeeClient } = user;
	if (!ieeeClient) throw new AuthError("Not logged in");

	const [buffer, page] = await Promise.all([
		ieeeClient.getCsv(
			`https://mentor.ieee.org/${workingGroup.name}/poll-results.csv?p=${ballot.EpollNum}`
		),
		ieeeClient.getHtml(
			`https://mentor.ieee.org/${workingGroup.name}/poll-status?p=${ballot.EpollNum}`
		),
	]);

	const pollResults = await parseEpollResults("poll-results.csv", buffer);
	const pollResults2 = parseEpollResultsHtml(page);

	// Update poll results with Name and Affiliation from HTML (not present in .csv)
	const results: Omit<ResultDB, "id" | "ballot_id" | "Notes">[] =
		pollResults.map((r) => {
			const h = pollResults2.find((h) => h.Email === r.Email);
			return {
				...r,
				Name: h ? h.Name : "",
				Affiliation: h ? h.Affiliation : "",
			};
		});

	return insertResults(ballot, results);
}

/**
 * Upload results from spreadsheet.
 *
 * The expected spreadsheet format depends on the ballot type.
 * For SA ballot, the MyProject spreadsheet format is expected.
 * For WG ballot, the ePoll .xlsx or .csv format is expected.
 */
export async function uploadResults(
	ballot: Ballot,
	filename: string,
	buffer: Buffer
) {
	let results: Partial<ResultDB>[];
	if (ballot.Type === BallotType.SA) {
		results = await parseMyProjectResults(filename, buffer);
	} else {
		results = await parseEpollResults(filename, buffer);
	}
	return insertResults(ballot, results);
}

export const sanitize = (name: string) =>
	name.slice(0, 30).replace(/[*.?:\\/[\]]/g, "_");

export async function exportResults(
	user: User,
	ballot: Ballot,
	forBallotSeries: boolean,
	res: Response
) {
	let fileNamePrefix: string;
	let resultsArr: Result[][];
	const ballots = await getBallotSeries(ballot.id);
	if (ballots.length === 0)
		throw new NotFoundError(`No such ballot: ${ballot.id}`);

	if (forBallotSeries) {
		resultsArr = await Promise.all(ballots.map(getResultsCoalesced));
		fileNamePrefix = ballot.Project;
	} else {
		resultsArr = [await getResultsCoalesced(ballot)];
		fileNamePrefix = ballot.BallotID;
	}
	res.attachment(sanitize(fileNamePrefix) + "_results.xlsx");
	return genResultsSpreadsheet(user, ballots, resultsArr, res);
}
