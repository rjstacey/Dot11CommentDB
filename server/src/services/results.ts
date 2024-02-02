
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import { shallowEqual, AuthError, NotFoundError } from '../utils';
import type { ResultSetHeader } from 'mysql2';
import type { Response } from 'express';
import type { User } from './users';

import { parseEpollResultsCsv, parseEpollResultsHtml } from './epoll';
import { parseMyProjectResults } from './myProjectSpreadsheets';
import { genResultsSpreadsheet } from './resultsSpreadsheet';
import { getBallotSeries, BallotType, Ballot } from './ballots';
import { getVoters, Voter } from './voters';
import { AccessLevel } from '../auth/access';
import { getWorkingGroup } from './groups';

export type Result = {
    id: string;
    ballot_id: number;
    SAPIN: number;
	CurrentSAPIN: number;
    Email?: string;
    Name: string;
    Affiliation: string;
	Status: string;
    Vote: string;
    CommentCount: number;
	Notes: string;
}

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
}

type BallotSeriesResults = {
	ids: number[];
	ballots: Record<number, Ballot>;
	results: Record<number, Result[]>;
}

function appendStr(toStr: string, str: string) {
	return (toStr? toStr + ', ': '') + str;
}

function colateWGResults(ballotSeries: BallotSeriesResults, voters: Voter[]) {
	// Collect each voters last vote
	const ballotIdsReversed = ballotSeries.ids.slice().reverse();
	const finalBallot_id = ballotIdsReversed[0];

	let results = voters.map(voter => {
		const v: Result = {
			...voter,
			id: uuid(),
			ballot_id: 0,
			Vote: '',
			CommentCount: 0,
			Notes: ''
		}

		for (const ballot_id of ballotIdsReversed) {
			const results = ballotSeries.results[ballot_id];
			const r = results.find(r => r.CurrentSAPIN === voter.CurrentSAPIN)
			if (r) {
				// Record the vote
				v.Vote = r.Vote;
				v.CommentCount = r.CommentCount;
				v.Affiliation = r.Affiliation;
				if (v.SAPIN !== r.SAPIN)
					v.Notes = appendStr(v.Notes, `Voted with SAPIN=${r.SAPIN}`);
				// Add note if vote is from a previous ballot
				if (ballot_id !== finalBallot_id) {
					const ballot = ballotSeries.ballots[ballot_id];
					v.Notes = appendStr(v.Notes, 'From ' + ballot.BallotID);
				}
				break;
			}
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(v.Status))
			v.Notes = appendStr(v.Notes, v.Status);

		return v;
	});

	// Add results for those that voted but are not in the pool)
	results = results.concat(ballotSeries.results[finalBallot_id]
		.filter(r => !voters.find(v => v.CurrentSAPIN === r.CurrentSAPIN))
		.map(r => ({
			...r,
			id: uuid(),
			Notes: 'Not in pool'
		}))
	)

	// Remove ExOfficio if they did not vote
	results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote));

	return results;
}

function summarizeWGResults(results: Result[]): ResultsSummary {

	let summary: ResultsSummary = {
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
		Commenters: 0
	};

	for (let r of results) {
		if (/^Not in pool/.test(r.Notes))
			summary.InvalidVote++;
		else {
			if (/^Approve/.test(r.Vote))
					summary.Approve++;
			else if (/^Disapprove/.test(r.Vote)) {
				if (r.CommentCount)
					summary.Disapprove++;
				else
					summary.InvalidDisapprove++;
			}
			else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++;
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.InvalidAbstain++;
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a valid vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++;
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain.*expertise/.test(r.Vote)) {
				summary.ReturnsPoolSize++;
			}
		}

		if (r.CommentCount)
			summary.Commenters++;
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function colateSAResults(ballotSeries: BallotSeriesResults): Result[] {
	const ballotIdsReversed = ballotSeries.ids.slice().reverse();
	const finalBallot_id = ballotIdsReversed.shift()!;
	const results = ballotSeries.results[finalBallot_id].map(r1 => {
		const v: Result = {
			...r1,
			id: uuid(),
			Notes: ''
		};
		if (r1.Vote === 'Disapprove' && r1.CommentCount === 0) {
			// See if they have a comment from a previous round
			for (let ballot_id of ballotIdsReversed) {
				const r2 = ballotSeries.results[ballot_id].find(r => 
					(r.Email && r1.Email && r.Email === r1.Email) ||
					(r.Name === r1.Name)
				);
				if (r2 && r2.CommentCount) {
					v.CommentCount = r2.CommentCount;
					v.Notes = 'Comments from ' + ballotSeries.ballots[ballot_id].BallotID;
					break;
				}
			};
		}
		return v;
	});

	return results;
}

function summarizeSAResults(results: Result[]) {

	let summary: ResultsSummary = {
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

	results.forEach(r => {
		if (/^Approve/.test(r.Vote)) {
				summary.Approve++;
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount)
				summary.Disapprove++;
			else
				summary.InvalidDisapprove++;
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++;
		}

		if (r.CommentCount)
			summary.Commenters++;
	});

	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.InvalidDisapprove + summary.Abstain;

	return summary;
}

function colateMotionResults(ballotResults: Result[], voters: Voter[]) {
	// Collect each voters last vote
	let results = voters
		.map(voter => {
			let v: Result = {
				...voter,
				id: uuid(),
				ballot_id: 0,
				CommentCount: 0,
				Vote: '',
				Notes: ''
			}
			let r = ballotResults.find(r => r.CurrentSAPIN === v.CurrentSAPIN);
			if (r) {
				// If the voter voted in this round, record the vote
				v.Vote = r.Vote;
				v.CommentCount = r.CommentCount;
				v.Affiliation = r.Affiliation;
				if (v.SAPIN !== r.SAPIN)
					v.Notes = appendStr(v.Notes, `Pool SAPIN=${v.SAPIN} vote SAPIN=${r.SAPIN}`);
			}

			// If this is an ExOfficio voter, then note that
			if (v.Vote && /^ExOfficio/.test(voter.Status))
				v.Notes = appendStr(v.Notes, voter.Status);

			return v;
		});

	// Add results for those that voted but are not in the pool)
	results = results
		.concat(ballotResults
			.filter(r => !voters.find(v => v.CurrentSAPIN === r.CurrentSAPIN))
			.map(r => ({
				...r,
				id: uuid(),
				Notes: 'Not in pool'
			}))
		);

	return results;
}


function summarizeMotionResults(results: Result[]) {
	let summary: ResultsSummary = {
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
		Commenters: 0
	};

	results.forEach(r => {
		if (/^Not in pool/.test(r.Notes)) {
			summary.InvalidVote++;
		}
		else {
			if (/^Approve/.test(r.Vote))
				summary.Approve++;
			else if (/^Disapprove/.test(r.Vote))
				summary.Disapprove++;
			else if (/^Abstain/.test(r.Vote))
				summary.Abstain++;

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++;
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain/.test(r.Vote)) {
				summary.ReturnsPoolSize++;
			}
		}

		if (r.CommentCount)
			summary.Commenters++;
	});

	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function summarizeCCResults(results: Result[]) {
	let summary: ResultsSummary = {
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
		Commenters: 0
	};

	results.forEach(r => {
		if (/^Approve/.test(r.Vote))
			summary.Approve++;
		else if (/^Disapprove/.test(r.Vote))
			summary.Disapprove++;
		else if (/^Abstain/.test(r.Vote))
			summary.Abstain++;

		// Count the number of commenters
		if (r.CommentCount)
			summary.Commenters++;
	});

	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;
	summary.BallotReturns = results.length;

	return summary;
}

export type ResultsCoalesced = {
	ballot: Ballot;
	results: Result[];
}

export async function getResultsCoalesced(user: User, access: number, ballot: Ballot): Promise<ResultsCoalesced> {

	let votingPoolSize: number,
		results: Result[],
		summary: ResultsSummary;

	if (ballot.Type === BallotType.WG) {
		const ballotsArr = await getBallotSeries(ballot.id);
		const resultsArr = await Promise.all(ballotsArr.map(ballot => getResultsForWgBallot(ballot.id)));
		const ballotSeries: BallotSeriesResults = {
			ids: [],
			ballots: {},
			results: {}
		};
		ballotsArr.forEach((ballot, i) => {
			const id = ballot.id;
			ballotSeries.ids.push(id);
			ballotSeries.ballots[id] = ballot;
			ballotSeries.results[id] = resultsArr[i];
		});
		const initialBallot_id = ballotSeries.ids[0];
		const voters = await getVoters({ballot_id: initialBallot_id});
		// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
		votingPoolSize = voters.filter(v => !/^ExOfficio/.test(v.Status)).length;
		results = colateWGResults(ballotSeries, voters); // colate results against voting pool and prior ballots in series
		summary = summarizeWGResults(results);
		summary.BallotReturns = ballotSeries.results[ballot.id].length;
		summary.VotingPoolSize = votingPoolSize;
	}
	else if (ballot.Type === BallotType.SA) {
		const ballotsArr = await getBallotSeries(ballot.id);
		const resultsArr = await Promise.all(ballotsArr.map(ballot => getResultsForSaBallot(ballot.id)));
		const ballotSeries: BallotSeriesResults = {
			ids: [],
			ballots: {},
			results: {}
		};
		ballotsArr.forEach((ballot, i) => {
			const id = ballot.id;
			ballotSeries.ids.push(id);
			ballotSeries.ballots[id] = ballot;
			ballotSeries.results[id] = resultsArr[i];
		});
		votingPoolSize = ballotSeries.results[ballot.id].length;
		results = colateSAResults(ballotSeries); 		// colate results against previous ballots in series
		summary = summarizeSAResults(results);
		summary.BallotReturns = ballotSeries.results[ballot.id].length;
		summary.ReturnsPoolSize = votingPoolSize;
		summary.VotingPoolSize = votingPoolSize;
	}
	else if (ballot.Type === BallotType.Motion) {
		// if there is a voting pool, get that
		const voters = await getVoters({ballot_id: ballot.id});
		results = await getResults(ballot.id);
		results = colateMotionResults(results, voters);	// colate results for just this ballot
		summary = summarizeMotionResults(results);
		summary.BallotReturns = results.length;
		summary.VotingPoolSize =  voters.length;
	}
	else {
		results = await getResults(ballot.id);			// colate results for just this ballot
		summary = summarizeCCResults(results);
	}

	/* Update results summary in ballots table if different */
	if (!ballot.Results || !shallowEqual(summary, ballot.Results)) {
		await db.query('UPDATE ballots SET ResultsSummary=? WHERE id=?', [JSON.stringify(summary), ballot.id]);
		ballot = {...ballot, Results: summary};
	}

	if (access < AccessLevel.admin) {
		// Strip email addresses if user does not have admin access
		results.forEach(r => delete r.Email);
	}

	return {
		ballot,
		results,
	};
}

export async function getResults(ballot_id: number) {
	let sql =
		'SELECT ' + 
			'r.ballot_id, ' +
			'r.SAPIN, r.Email, r.Name, r.Affiliation, r.Vote, ' +
			'BIN_TO_UUID(r.uuid) AS id, ' +
			'(SELECT COUNT(*) ' +
				'FROM comments c WHERE c.ballot_id=r.ballot_id AND ' +
					'((c.CommenterSAPIN>0 AND c.CommenterSAPIN=r.SAPIN) OR ' +
					'(c.CommenterEmail<>"" AND c.CommenterEmail=r.Email) OR ' +
					'(c.CommenterName<>"" AND c.CommenterName=r.Name))) AS CommentCount, ' +
			'COALESCE(m.ReplacedBySAPIN, r.SAPIN) AS CurrentSAPIN ' +
		'FROM results r ' +
			'LEFT JOIN members m ON m.SAPIN=r.SAPIN AND m.Status="Obsolete" ' +
		'WHERE r.ballot_id=?';
	
	const results = await db.query(sql, [ballot_id]) as Result[];
	return results;
}

export async function getResultsForSaBallot(ballot_id: number) {
	let sql = db.format(
		'SET @ballot_id=?; ' +
		'SELECT ' + 
			'BIN_TO_UUID(r.uuid) AS id, ' +
			'r.ballot_id, ' +
			'r.SAPIN, r.Email, r.Name, r.Affiliation, r.Vote, ' +
			'COALESCE(c.CommentCount, 0) as CommentCount, ' +
			'NULL AS CurrentSAPIN ' +
		'FROM results r ' +
			'LEFT JOIN (SELECT CommenterEmail, CommenterName, COUNT(*) as CommentCount FROM comments WHERE ' + 
				'ballot_id=@ballot_id GROUP BY CommenterEmail, CommenterName) c ON ' + 
					'(r.Email<>"" AND c.CommenterEmail = r.Email) OR (r.Name<>"" AND c.CommenterName = r.Name) ' +
		'WHERE r.ballot_id=@ballot_id', [ballot_id]);

	const [, results] = await db.query(sql) as [ResultSetHeader, Result[]];
	return results;
}


export async function getResultsForWgBallot(ballot_id: number) {
	let sql = db.format(
		'SET @ballot_id=?; ' +
		'SELECT ' + 
			'BIN_TO_UUID(r.uuid) AS id, ' +
			'r.ballot_id, ' +
			'r.SAPIN, r.Email, r.Name, r.Affiliation, r.Vote, ' +
			'COALESCE(c.CommentCount, 0) as CommentCount, ' +
			'COALESCE(m.ReplacedBySAPIN, r.SAPIN) AS CurrentSAPIN ' +
		'FROM results r ' +
			'LEFT JOIN (SELECT CommenterSAPIN, COUNT(*) as CommentCount FROM comments WHERE CommenterSAPIN > 0 AND ballot_id = @ballot_id GROUP BY CommenterSAPIN) c ON c.CommenterSAPIN = r.SAPIN ' +
			'LEFT JOIN members m ON m.SAPIN=r.SAPIN AND m.Status="Obsolete" ' +
		'WHERE r.ballot_id=@ballot_id', [ballot_id]);

	const [, results] = await db.query(sql) as [ResultSetHeader, Result[]];
	return results;
}

export async function deleteResults(ballot_id: number) {
	const results = await db.query(
		'SET @ballot_id = ?; ' +
		'DELETE FROM results WHERE ballot_id=@ballot_id; ' +
		'UPDATE ballots SET ResultsSummary=NULL WHERE id=@ballot_id',
		[ballot_id]
	) as ResultSetHeader[];
	return results[1].affectedRows;
}

async function insertResults(user: User, access: number, ballot: Ballot, results: Partial<Result>[]) {
	let sql = db.format('DELETE FROM results WHERE ballot_id=?;', ballot.id);
	if (results.length)
		sql +=
			`INSERT INTO results (ballot_id, ${Object.keys(results[0])}) VALUES` +
			results.map(c => `(${ballot.id}, ${db.escape(Object.values(c))})`).join(',') +
			';'
	await db.query(sql);
	return getResultsCoalesced(user, access, ballot);
}

export async function importEpollResults(user: User, ballot: Ballot) {

	if (!ballot.EpollNum)
		throw new TypeError("Ballot does not have an ePoll number");
	const wg = await getWorkingGroup(user, ballot.groupId!);
	if (!wg)
		throw new TypeError("No working group associated with ballot");

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const p1 = ieeeClient.get(`https://mentor.ieee.org/${wg.name}/poll-results.csv?p=${ballot.EpollNum}`);
	const p2 = ieeeClient.get(`https://mentor.ieee.org/${wg.name}/poll-status?p=${ballot.EpollNum}`);

	let response = await p1;
	if (response.headers['content-type'] !== 'text/csv')
		throw new Error('Not logged in');
	var pollResults = await parseEpollResultsCsv(response.data);

	response = await p2;
	var pollResults2 = parseEpollResultsHtml(response.data);

	// Update poll results with Name and Affiliation from HTML (not present in .csv)
	const results: Omit<Result, "id" | "ballot_id" | "CommentCount" | "CurrentSAPIN" | "Status" | "Notes">[] = pollResults.map(r => {
		const h = pollResults2.find(h => h.Email === r.Email);
		return {
			...r,
			Name: h? h.Name: '',
			Affiliation: h? h.Affiliation: ''
		}
	});

	return insertResults(user, AccessLevel.admin, ballot, results);
}


/**
 * Upload results from spreadsheet.
 * 
 * The expected spreadsheet format depends on the ballot type.
 * For SA ballot, the MyProject spreadsheet format is expected.
 * For WG ballot, the ePoll .csv format is expected.
 */
export async function uploadResults(user: User, ballot: Ballot, file: any) {
	let results: Partial<Result>[];
	const isExcel = file.originalname.search(/\.xlsx$/i) !== -1;
	if (ballot.Type === BallotType.SA) {
		results = await parseMyProjectResults(file.buffer, isExcel);
	}
	else {
		if (isExcel)
			throw new TypeError('Expecting .csv file');
		try {
			results = await parseEpollResultsCsv(file.buffer);
		}
		catch (error: any) {
			throw new TypeError('Parse error: ' + error.toString());
		}
	}
	return insertResults(user, AccessLevel.admin, ballot, results);
}

export const getFilePrefix = (name: string) => name.slice(0, 30).replace(/[*.\?:\\\/\[\]]/g, '_');

export async function exportResults(user: User, access: number, ballot: Ballot, forBallotSeries: boolean, res: Response) {
	let results: ResultsCoalesced[];
	if (forBallotSeries) {
		let ballots = await getBallotSeries(ballot.id);
		if (ballots.length === 0)
			throw new NotFoundError(`No such ballot: ${ballot.id}`);
		results = await Promise.all(ballots.map(b => getResultsCoalesced(user, access, b)));
		res.attachment(getFilePrefix(ballots[0].Project) + '_results.xlsx');
	}
	else {
		const result = await getResultsCoalesced(user, access, ballot);
		results = [result];
		res.attachment(getFilePrefix(ballot.BallotID) + '_results.xlsx');
	}
	return genResultsSpreadsheet(user, results, res);
}
