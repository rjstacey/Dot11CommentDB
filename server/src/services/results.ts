
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

import {AccessLevel} from '../auth/access';
import {parseEpollResultsCsv, parseEpollResultsHtml} from './epoll';
import {parseMyProjectResults} from './myProjectSpreadsheets';
import {genResultsSpreadsheet} from './resultsSpreadsheet';
import {getBallot, getBallotSeriesWithResults, BallotType, Ballot} from './ballots';
import {getVoters} from './voters';

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

function appendStr(toStr: string, str: string) {
	if (typeof toStr === 'string') {
		return toStr + (toStr? ', ': '') + str
	}
	else {
		return str
	}
}

function colateWGResults(ballotSeries) {
	// Collect each voters last vote
	const ballotSeriesReversed = ballotSeries.slice().reverse();

	let results: Result[] = [];
	let i = 0;
	for (const voter of ballotSeries[0].Voters) {
		const v: Result = {
			...voter,
			id: uuid(),
			Vote: '',
			CommentCount: 0,
			Notes: ''
		}

		for (const ballot of ballotSeriesReversed) {
			//console.log(ballot.Results[0])
			const r = ballot.Results.find(r => r.CurrentSAPIN === voter.CurrentSAPIN)
			if (r) {
				i++;
				// Record the vote
				v.Vote = r.Vote;
				v.CommentCount = r.CommentCount;
				v.Affiliation = r.Affiliation;
				if (v.SAPIN !== r.SAPIN)
					v.Notes = appendStr(v.Notes, `Voted with SAPIN=${r.SAPIN}`);
				// Add note if vote is from a previous ballot
				if (ballot !== ballotSeriesReversed[0])
					v.Notes = appendStr(v.Notes, 'From ' + ballot.BallotID);
				break;
			}
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(v.Status))
			v.Notes = appendStr(v.Notes, v.Status);

		results.push(v);
	}

	// Add results for those that voted but are not in the pool)
	i = 0;
	for (const r of ballotSeries[ballotSeries.length - 1].Results) {
		if (results.findIndex(v => v.CurrentSAPIN === r.CurrentSAPIN) < 0) {
			i++;
			const nv = {
				...r,
				id: uuid(),
				Notes: 'Not in pool'
			}
			results.push(nv);
		}
	}

	// Remove ExOfficio if they did not vote
	results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote));
	return results;
}

function summarizeWGResults(results: Result[]): ResultsSummary {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0,
		VotingPoolSize: 0
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
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function colateSAResults(ballotSeries): Result[] {
	const results: Result[] = [];
	//console.log(ballotSeries[ballotSeries.length - 1].Results)
	for (let r1 of ballotSeries[ballotSeries.length - 1].Results) {
		const v: Result = {
			...r1,
			id: uuid(),
			Notes: ''
		};
		if (r1.Vote === 'Disapprove' && r1.CommentCount === 0) {
			// See if they have a comment from a previous round
			for (let i = ballotSeries.length - 2; i >= 0; i--) {
				const r2 = ballotSeries[i].Results.find(r => 
					(r.Email && r1.Email && r.Email === r1.Email) ||
					(r.Name === r1.Name)
				);
				if (r2 && r2.CommentCount) {
					v.CommentCount = r2.CommentCount;
					v.Notes = 'Comments from ' + ballotSeries[i].BallotID;
					break;
				}
			}
		}
		results.push(v);
	}

	return results;
}

function summarizeSAResults(results: Result[]) {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0,
		VotingPoolSize: 0
	};

	for (let r of results) {
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
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.InvalidDisapprove + summary.Abstain;

	return summary;
}

function colateMotionResults(ballotResults, voters) {
	// Collect each voters last vote
	let results: Result[] = [];
	for (let voter of voters) {
		let v = {
			...voter,
			id: uuid(),
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

		results.push(v);
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotResults) {
		if (results.findIndex(v => v.CurrentSAPIN === r.CurrentSAPIN) < 0) {
			const nv = {
				...r,
				id: uuid(),
				Notes: 'Not in pool'
			};
			results.push(r);
		}
	}

	return results;
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
}

function summarizeMotionResults(results: Result[]): ResultsSummary {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0,
		VotingPoolSize: 0
	};

	for (let r of results) {
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
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

function summarizeBallotResults(results: Result[]): ResultsSummary {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0,
		VotingPoolSize: 0
	};

	for (let r of results) {
		if (/^Approve/.test(r.Vote)) {
			summary.Approve++;
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount)
				summary.Disapprove++;
			else
				summary.InvalidDisapprove++
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++;
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary;
}

export async function getResultsCoalesced(user, ballot_id: number) {

	const ballot: Ballot = await getBallot(ballot_id);

	let ballotSeries,
		votingPoolId: string,
		votingPoolSize: number,
		results: Result[],
		summary: ResultsSummary;

	if (ballot.Type === BallotType.WG ) {
		ballotSeries = await getBallotSeriesWithResults(ballot_id);
		//console.log(ballotSeries);
		// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
		votingPoolId = ballotSeries[0].VotingPoolID;
		votingPoolSize = ballotSeries[0].Voters.filter(v => !/^ExOfficio/.test(v.Status)).length;
		results = colateWGResults(ballotSeries); // colate results against voting pool and prior ballots in series
		summary = summarizeWGResults(results);
		summary.BallotReturns = ballotSeries[ballotSeries.length-1].Results.length;
		summary.VotingPoolSize = votingPoolSize;
	}
	else if (ballot.Type === BallotType.SA) {
		ballotSeries = await getBallotSeriesWithResults(ballot_id);
		votingPoolId = '';
		votingPoolSize = ballotSeries[ballotSeries.length-1].Results.length;
		results = colateSAResults(ballotSeries); // colate results against previous ballots in series
		summary = summarizeSAResults(results);
		summary.BallotReturns = ballotSeries[ballotSeries.length-1].Results.length;
		summary.ReturnsPoolSize = votingPoolSize;
		summary.VotingPoolSize = votingPoolSize;
	}
	else if (ballot.Type === BallotType.Motion) {
		// if there is a voting pool, get that
		const {voters} = await getVoters(ballot.VotingPoolID);
		results = await getResults(ballot_id);
		votingPoolId = ballot.VotingPoolID;
		votingPoolSize = voters.length;
		results = colateMotionResults(results, voters);	// colate results for just this ballot
		summary = summarizeMotionResults(results);
		summary.BallotReturns = results.length;
		summary.VotingPoolSize = votingPoolSize;
	}
	else {
		votingPoolId = ballot.VotingPoolID;
		votingPoolSize = 0;
		results = await getResults(ballot_id);			// colate results for just this ballot
		summary = summarizeBallotResults(results);
		summary.BallotReturns = results.length;
		summary.VotingPoolSize = votingPoolSize;
	}

	/* Update results summary in ballots table if different */
	const ResultsSummary = JSON.stringify(summary)
	if (ResultsSummary !== ballot.ResultsSummary)
		await db.query('UPDATE ballots SET ResultsSummary=? WHERE id=?', [ResultsSummary, ballot_id]);

	ballot.Results = JSON.parse(ResultsSummary);
	delete ballot.ResultsSummary;
	//console.log(ballot)

	if (!user || user.Access < AccessLevel.WGAdmin) {
		// Strip email addresses if user has insufficient karma
		results.forEach(r => delete r.Email);
	}

	return {
		BallotID: ballot.BallotID,
		VotingPoolID: votingPoolId,
		VotingPoolSize: votingPoolSize,
		ballot,
		results,
		summary
	};
}

export async function getResults(ballot_id: number): Promise<Result[]> {
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
	
	const results = await db.query(sql, [ballot_id])as Result[];
	return results;
}

export async function getResultsForWgBallot(ballot_id: number): Promise<Result[]> {
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

	const [noop, results] = await db.query(sql) as [OkPacket, Result[]];
	return results;
}

export async function deleteResults(ballot_id: number): Promise<number> {
	const results = await db.query(
		'SET @ballot_id = ?; ' +
		'DELETE FROM results WHERE ballot_id=@ballot_id; ' +
		'UPDATE ballots SET ResultsSummary=NULL WHERE id=@ballot_id',
		[ballot_id]
	) as OkPacket[];
	return results[1].affectedRows;
}

async function insertResults(user, ballot_id: number, pollResults: Partial<Result>[]) {
	let SQL = db.format('DELETE FROM results WHERE ballot_id=?;', ballot_id);
	if (pollResults.length)
		SQL +=
			`INSERT INTO results (ballot_id, ${Object.keys(pollResults[0])}) VALUES` +
			pollResults.map(c => `(${ballot_id}, ${db.escape(Object.values(c))})`).join(',') +
			';'
	await db.query(SQL);
	return getResultsCoalesced(user, ballot_id);
}

export async function importEpollResults(user, ballot_id: number, epollNum: number) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new Error('Not logged in');

	const p1 = ieeeClient.get(`https://mentor.ieee.org/802.11/poll-results.csv?p=${epollNum}`, {responseType: 'text/csv'});
	const p2 = ieeeClient.get(`https://mentor.ieee.org/802.11/poll-status?p=${epollNum}`);

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

	return insertResults(user, ballot_id, results);
}

export async function uploadEpollResults(user, ballotId: number, file) {
	const pollResults = await parseEpollResultsCsv(file.buffer)
	return insertResults(user, ballotId, pollResults);
}

export async function uploadMyProjectResults(user, ballotId: number, file) {
	const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
	const pollResults = await parseMyProjectResults(file.buffer, isExcel)
	return insertResults(user, ballotId, pollResults);
}

export async function exportResultsForBallot(user, ballot_id: number, res) {
	const result = await getResultsCoalesced(user, ballot_id);
	res.attachment(result.ballot.BallotID + '_results.xlsx');
	await genResultsSpreadsheet([result], res);
	res.end();
}

export async function exportResultsForProject(user, project: string, res) {
	let ballots = await db.query('SELECT id FROM ballots WHERE Project=?', [project]) as Ballot[];
	let results = await Promise.all(ballots.map(r => getResultsCoalesced(user, r.id)));
	res.attachment(project + '_results.xlsx');
	await genResultsSpreadsheet(results, res);
	res.end();
}