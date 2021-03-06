'use strict';

import {parseEpollResultsCsv, parseEpollResultsHtml} from './epoll'
import {parseMyProjectResults} from './myProjectSpreadsheets'
import {genResultsSpreadsheet} from './resultsSpreadsheet'
import {AccessLevel} from '../auth/access'
import {getBallot, getBallotSeriesWithResults} from './ballots'
import {getVoters} from './voters'

const db = require('../util/database')
const rp = require('request-promise-native')

function appendStr(toStr, str) {
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
	let results = [];
	let id = 0;
	for (const voter of ballotSeries[0].Voters) {
		const v = {
			...voter,
			id: id++,
			Vote: '',
			CommentCount: 0,
			Notes: ''
		}
		for (const ballot of ballotSeriesReversed) {
			const r = ballot.Results.find(r => r.CurrentSAPIN === voter.CurrentSAPIN)
			if (r) {
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
	for (const r of ballotSeries[ballotSeries.length - 1].Results) {
		if (results.findIndex(v => v.CurrentSAPIN === r.CurrentSAPIN) < 0) {
			const nv = {
				...r,
				id: id++,
				Notes: 'Not in pool'
			}
			results.push(nv);
		}
	}

	// Remove ExOfficio if they did not vote
	results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote));
	return results;
}

function summarizeWGResults(results) {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Not in pool/.test(r.Notes))
			summary.InvalidVote++
		else {
			if (/^Approve/.test(r.Vote))
					summary.Approve++
			else if (/^Disapprove/.test(r.Vote)) {
				if (r.CommentCount)
					summary.Disapprove++
				else
					summary.InvalidDisapprove++
			}
			else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.InvalidAbstain++
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a valid vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain.*expertise/.test(r.Vote)) {
				summary.ReturnsPoolSize++
			}
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary
}

function colateSAResults(ballotSeries) {
	const results = [];
	let id = 0;
	console.log(ballotSeries[ballotSeries.length - 1].Results)
	for (let r1 of ballotSeries[ballotSeries.length - 1].Results) {
		const v = {
			...r1,
			id: id++,
			Notes: ''
		}
		if (r1.Vote === 'Disapprove' && r1.CommentCount === 0) {
			// See if they have a comment from a previous round
			for (let i = ballotSeries.length - 2; i >= 0; i--) {
				const r2 = ballotSeries[i].Results.find(r => r.Email === r1.Email)
				if (r2 && r2.CommentCount) {
					v.CommentCount = r2.CommentCount
					v.Notes = 'Comments from ' + ballotSeries[i].BallotID
					break;
				}
			}
		}
		results.push(v);
	}

	return results
}

function summarizeSAResults(results) {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Approve/.test(r.Vote)) {
				summary.Approve++
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount) {
				summary.Disapprove++
			}
			else {
				summary.InvalidDisapprove++
			}
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.InvalidDisapprove + summary.Abstain

	return summary
}

function colateMotionResults(ballotResults, voters) {
	// Collect each voters last vote
	let results = [];
	let id = 0;
	for (let voter of voters) {
		let v = {
			...voter,
			id: id++,
			Vote: '',
			Notes: ''
		}
		let r = ballotResults.find(r => r.CurrentSAPIN === v.CurrentSAPIN)
		if (r) {
			// If the voter voted in this round, record the vote
			v.Vote = r.Vote
			v.CommentCount = r.CommentCount
			v.Affiliation = r.Affiliation
			if (v.SAPIN !== r.SAPIN)
				v.Notes = appendStr(v.Notes, `Pool SAPIN=${v.SAPIN} vote SAPIN=${r.SAPIN}`);
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(voter.Status))
			v.Notes = appendStr(v.Notes, voter.Status)

		results.push(v);
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotResults) {
		if (results.findIndex(v => v.CurrentSAPIN === r.CurrentSAPIN) < 0) {
			const nv = {
				...r,
				id: id++,
				Notes: 'Not in pool'
			};
			results.push(r);
		}
	}

	return results;
}

function summarizeMotionResults(results) {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Not in pool/.test(r.Notes)) {
			summary.InvalidVote++
		}
		else {
			if (/^Approve/.test(r.Vote)) {
				summary.Approve++
			}
			else if (/^Disapprove/.test(r.Vote)) {
				summary.Disapprove++
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.Abstain++
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain/.test(r.Vote)) {
				summary.ReturnsPoolSize++
			}
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain

	return summary
}

function summarizeBallotResults(results) {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Approve/.test(r.Vote)) {
			summary.Approve++
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount) {
				summary.Disapprove++
			}
			else {
				summary.InvalidDisapprove++
			}
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain

	return summary
}

export const BallotType = {
	CC: 0,			// comment collection
	WG_Initial: 1,	// initial WG ballot
	WG_Recirc: 2,	// WG ballot recirculation
	SA_Initial: 3,	// initial SA ballot
	SA_Recirc: 4,	// SA ballot recirculation
	Motion: 5		// motion
};

export async function getResultsCoalesced(user, ballotId) {

	const ballot = await getBallot(ballotId);

	let ballotSeries, votingPoolId, votingPoolSize, voters, results, summary;
	if (ballot.Type === BallotType.WG_Initial || ballot.Type === BallotType.WG_Recirc) {
		ballotSeries = await getBallotSeriesWithResults(ballotId);
		// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
		votingPoolId = ballotSeries[0].VotingPoolID;
		votingPoolSize = ballotSeries[0].Voters.filter(v => !/^ExOfficio/.test(v.Status)).length;
		results = colateWGResults(ballotSeries); // colate results against voting pool and prior ballots in series
		summary = summarizeWGResults(results);
		summary.BallotReturns = ballotSeries[ballotSeries.length-1].Results.length;
	}
	else if (ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.SA_Recirc) {
		ballotSeries = await getBallotSeriesWithResults(ballotId);
		votingPoolId = '';
		votingPoolSize = ballotSeries[ballotSeries.length-1].Results.length;
		results = colateSAResults(ballotSeries); // colate results against previous ballots in series
		summary = summarizeSAResults(results);
		summary.BallotReturns = ballotSeries[ballotSeries.length-1].Results.length;
		summary.ReturnsPoolSize = votingPoolSize;
	}
	else if (ballot.Type === BallotType.Motion) {
		// if there is a voting pool, get that
		const {voters} = await getVoters(ballot.VotingPoolID);
		results = await getResults(ballotId);
		votingPoolId = ballot.VotingPoolID;
		votingPoolSize = voters.length;
		results = colateMotionResults(results, voters);	// colate results for just this ballot
		summary = summarizeMotionResults(results)
		summary.BallotReturns = results.length;
	}
	else {
		votingPoolId = ballot.VotingPoolID;
		votingPoolSize = 0;
		results = await getResults(ballotId);			// colate results for just this ballot
		summary = summarizeBallotResults(results);
		summary.BallotReturns = results.length;
	}

	/* Update results summary in ballots table if different */
	const ResultsSummary = JSON.stringify(summary)
	if (ResultsSummary !== ballot.ResultsSummary)
		await db.query('UPDATE ballots SET ResultsSummary=? WHERE BallotID=?', [ResultsSummary, ballotId])	

	ballot.Results = JSON.parse(ResultsSummary);
	delete ballot.ResultsSummary;
	//console.log(ballot)

	if (!user || user.Access < AccessLevel.WGAdmin) {
		// Strip email addresses if user has insufficient karma
		results.forEach(r => delete r.Email);
	}

	return {
		BallotID: ballotId,
		VotingPoolID: votingPoolId,
		VotingPoolSize: votingPoolSize,
		ballot,
		results,
		summary
	}
}

export async function getResults(ballotId) {
	const results = await db.query(
		'SELECT ' + 
			'r.*, ' +
			'(SELECT COUNT(*) ' +
				'FROM comments c WHERE c.ballot_id=b.id AND ' +
					'((c.CommenterSAPIN>0 AND c.CommenterSAPIN=r.SAPIN) OR ' +
					 '(c.CommenterEmail<>\'\' AND c.CommenterEmail=r.Email))) AS CommentCount, ' +
			'COALESCE(m.ReplacedBySAPIN, r.SAPIN) AS CurrentSAPIN ' +
		'FROM results r ' +
			'LEFT JOIN members m ON m.SAPIN=r.SAPIN AND m.Status=\'Obsolete\' ' +
			'LEFT JOIN ballots b ON r.ballot_id=b.id ' +
			'WHERE b.BallotID=?',
		[ballotId]
	);
	return results;
}

export async function deleteResults(ballotId) {
	await db.query(
		'SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?); ' +
		'DELETE FROM results WHERE ballot_id=@ballot_id; ' +
		'UPDATE ballots SET ResultsSummary=NULL WHERE id=@ballot_id',
		[ballotId]
	);
}

async function insertResults(user, ballotId, pollResults) {
	const result = await db.query('SELECT id FROM ballots WHERE BallotID=?', [ballotId]);
	if (result.length === 0)
		throw `Ballot ${ballotId} does not exist`;
	const ballot_id = result[0].id;

	let SQL = db.format('DELETE FROM results WHERE ballot_id=?;', ballot_id);
	if (pollResults.length)
		SQL +=
			`INSERT INTO results (ballot_id, ${Object.keys(pollResults[0])}) VALUES` +
			pollResults.map(c => `(${ballot_id}, ${db.escape(Object.values(c))})`).join(',') +
			';'
	await db.query(SQL);
	return getResultsCoalesced(user, ballotId);
}

export async function importEpollResults(ieeeCookieJar, user, ballotId, epollNum) {

	const p1 = rp.get({
		url: `https://mentor.ieee.org/802.11/poll-results.csv?p=${epollNum}`,
		jar: ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	});

	const p2 = rp.get({
		url: `https://mentor.ieee.org/802.11/poll-status?p=${epollNum}`,
		jar: ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	});

	var ieeeRes = await p1;
	if (ieeeRes.headers['content-type'] !== 'text/csv')
		throw 'Not logged in';
	var pollResults = parseEpollResultsCsv(ieeeRes.body);

	ieeeRes = await p2;
	var pollResults2 = parseEpollResultsHtml(ieeeRes.body);

	// Update poll results with Name and Affiliation from HTML (not present in .csv)
	pollResults.forEach(r => {
		const h = pollResults2.find(h => h.Email === r.Email)
		r.Name = h? h.Name: ''
		r.Affiliation = h? h.Affiliation: ''
	});

	return insertResults(user, ballotId, pollResults);
}

export async function uploadEpollResults(user, ballotId, file) {
	const pollResults = parseEpollResultsCsv(file.buffer)
	return insertResults(user, ballotId, pollResults);
}

export async function uploadMyProjectResults(user, ballotId, file) {
	const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
	const pollResults = await parseMyProjectResults(file.buffer, isExcel)
	return insertResults(user, ballotId, pollResults);
}

export async function exportResults(user, params, res) {
	let results
	let fileNamePrefix = ''
	if (params.hasOwnProperty('BallotID')) {
		const ballotId = params.BallotID
		fileNamePrefix = ballotId
		const result = await getResultsCoalesced(user, ballotId)
		results = [result]	// turn parameter into an array
	}
	else if (params.hasOwnProperty('BallotIDs')) {
		const ballotIds = params.BallotIDs
		fileNamePrefix = ballotIds.join('_')
		results = await Promise.all(ballotIds.map(ballotId => getResultsCoalesced(user, ballotId)))
	}
	else if (params.hasOwnProperty('Project')) {
		const project = params.Project
		fileNamePrefix = project
		results = await db.query('SELECT BallotID FROM ballots WHERE Project=?', [project])
		results = await Promise.all(results.map(r => getResultsCoalesced(user, r.BallotID)))
	}
	else {
		throw 'Missing parameter BallotID, BallotIDs or Project'
	}

	res.attachment(fileNamePrefix + '_results.xlsx')
	await genResultsSpreadsheet(results, res)
	res.end()
}
