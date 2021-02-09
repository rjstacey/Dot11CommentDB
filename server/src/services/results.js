'use strict';

import {parseEpollResultsCsv} from './ePollCSV'
import {parseEpollResultsHtml} from './ePollHTML'
import {parseMyProjectResults} from './myProjectSpreadsheets'
import {genResultsSpreadsheet} from './resultsSpreadsheet'
import {AccessLevel} from '../auth/access'

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

function colateWGResults(ballotSeries, voters) {
	// Collect each voters last vote
	let results = []
	for (let voter of voters) {
		let v = {}
		v.SAPIN = voter.SAPIN
		v.Email = voter.Email
		v.Status = voter.Status
		v.Vote = ''
		v.Notes = ''
		v.Name = voter.FirstName + ' ' + voter.LastName
		let r = ballotSeries[ballotSeries.length-1].results.find(r => r.SAPIN === voter.SAPIN)
		if (r) {
			// If the voter voted in this round, record the vote
			v.Vote = r.Vote
			v.CommentCount = r.CommentCount
			v.Affiliation = r.Affiliation
		}
		else {
			// Otherwise, see if they voted under a different SA PIN
			r = ballotSeries[ballotSeries.length - 1].results.find(r => {
				// We detect this as a vote with different SA PIN, but same email address
				return r.SAPIN !== voter.SAPIN &&
					   r.Email.toLowerCase() === voter.Email.toLowerCase()
			})
			if (r) {
				v.Notes = 'Voted with SAPIN=' + r.SAPIN
				v.Vote = r.Vote
				v.Affiliation = r.Affiliation
				v.CommentCount = r.CommentCount
				r.Notes = 'In pool as SAPIN=' + voter.SAPIN
			}
			else {
				// Otherwise, find their last vote and record that
				for (let i = ballotSeries.length - 2; i >= 0; i--) {
					r = ballotSeries[i].results.find(r => r.SAPIN === voter.SAPIN)
					if (r && r.Vote) {
						v.Vote = r.Vote
						v.CommentCount = r.CommentCount
						v.Affiliation = r.Affiliation
						v.Notes = 'From ' + ballotSeries[i].BallotID
						break
					}
				}
			}
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(voter.Status)) {
			v.Notes = appendStr(v.Notes, voter.Status)
		}

		results.push(v)
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotSeries[ballotSeries.length - 1].results) {
		if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
			if (!r.Notes) {	// might be "In pool as..."
				r.Notes = 'Not in pool'
			}
			results.push(r)
		}
	}

	// Remove ExOfficio if they did not vote
	results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote))
	return results
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
		if (/[Ii]n pool/.test(r.Notes)) {
			if (/Not in pool/.test(r.Notes)) {
				summary.InvalidVote++
			}
		}
		else {
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
	let results = ballotSeries[ballotSeries.length-1].results;
	for (let r1 of results) {
		if (r1.Vote === 'Disapprove' && r1.CommentCount === 0) {
			// See if they have a comment from a previous round
			for (let i = ballotSeries.length - 2; i >= 0; i--) {
				const r2 = ballotSeries[i].results.find(r => r.Email === r1.Email)
				if (r2 && r2.CommentCount) {
					r1.CommentCount = r2.CommentCount
					r1.Notes = 'Comments from ' + ballotSeries[i].BallotID
					break;
				}
			}
		}
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
	let results = []
	for (let voter of voters) {
		let v = {}
		v.SAPIN = voter.SAPIN
		v.Email = voter.Email
		v.Status = voter.Status
		v.Vote = ''
		v.Notes = ''
		v.Name = voter.FirstName + ' ' + voter.LastName
		let r = ballotResults.find(r => r.SAPIN === voter.SAPIN)
		if (r) {
			// If the voter voted in this round, record the vote
			v.Vote = r.Vote
			v.CommentCount = r.CommentCount
			v.Affiliation = r.Affiliation
		}
		else {
			// Otherwise, see if they voted under a different SA PIN
			r = ballotResults.find(r => {
				// We detect this as a vote with different SA PIN, but same email address
				return r.SAPIN !== voter.SAPIN &&
					   r.Email.toLowerCase() === voter.Email.toLowerCase()
			})
			if (r) {
				v.Notes = 'Voted with SAPIN=' + r.SAPIN
				v.Vote = r.Vote
				v.Affiliation = r.Affiliation
				v.CommentCount = r.CommentCount
				r.Notes = 'In pool as SAPIN=' + voter.SAPIN
			}
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(voter.Status)) {
			v.Notes = appendStr(v.Notes, voter.Status)
		}

		results.push(v)
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotResults) {
		if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
			if (!r.Notes) {	// might be "In pool as..."
				r.Notes = 'Not in pool'
			}
			results.push(r)
		}
	}

	return results
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
		if (/[Ii]n pool/.test(r.Notes)) {
			if (/Not in pool/.test(r.Notes)) {
				summary.InvalidVote++
			}
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

export async function getResults(user, ballotId) {

	async function recursiveBallotSeriesGet(ballotSeries, ballotId) {
		const [ballots, results] = await db.query(
			'SELECT * FROM ballots WHERE BallotID=?; ' +
			'SELECT ' + 
				'r.*, ' +
				'(SELECT ' +
					'COUNT(*) ' +
				'FROM comments c WHERE c.ballot_id=b.id AND ((c.CommenterSAPIN IS NOT NULL AND c.CommenterSAPIN = r.SAPIN) OR (c.CommenterEmail IS NOT NULL AND c.CommenterEmail = r.Email) OR c.CommenterName = r.Name)) AS CommentCount ' +
			'FROM ballots b JOIN results r ON r.ballot_id=b.id WHERE b.BallotID=?;',
			[ballotId, ballotId]
		);

		if (ballots.length === 0)
			return ballotSeries;

		var b = Object.assign({}, ballots[0], {results})
		ballotSeries.unshift(b)
		return b.PrevBallotID? recursiveBallotSeriesGet(ballotSeries, b.PrevBallotID): ballotSeries
	}

	const ballotSeries = await recursiveBallotSeriesGet([], ballotId)	// then get results from each ballot in series
	if (ballotSeries.length === 0)
		throw `No such ballot: ${ballotId}`;
	const ballot = ballotSeries[ballotSeries.length-1];

	let votingPoolSize, results, summary;
	const type = ballotSeries[0].Type
	const votingPoolId  = ballotSeries[0].VotingPoolID
	if (type === BallotType.WG_Initial) {
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT SAPIN, LastName, FirstName, MI, Email, Status FROM wgVoters WHERE VotingPoolID=?',
			[votingPoolId]
		);
		// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
		votingPoolSize = voters.filter(v => !/^ExOfficio/.test(v.Status)).length;
		results = colateWGResults(ballotSeries, voters); // colate results against voting pool and prior ballots in series
		summary = summarizeWGResults(results);
		summary.BallotReturns = ballot.results.length;
	}
	else if (type === BallotType.SA_Initial) {
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT Email, Name FROM saVoters WHERE VotingPoolID=?',
			[votingPoolId]
		);
		votingPoolSize = ballot.results.length;
		results = colateSAResults(ballotSeries); // colate results against previous ballots in series
		summary = summarizeSAResults(results);
		summary.BallotReturns = ballot.results.length;
		summary.ReturnsPoolSize = votingPoolSize;
	}
	else if (type === BallotType.Motion) {
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT SAPIN, LastName, FirstName, MI, Email, Status FROM wgVoters WHERE VotingPoolID=?',
			[votingPoolId]
		);
		votingPoolSize = voters.length
		results = colateMotionResults(ballot.results, voters)	// colate results for just this ballot
		summary = summarizeMotionResults(results)
		summary.BallotReturns = ballot.results.length;
	}
	else {
		votingPoolSize = 0;
		results = ballotSeries[ballotSeries.length - 1].results;	// colate results for just this ballot
		summary = summarizeBallotResults(results);
		summary.BallotReturns = ballot.results.length;
	}

	/* Update results summary in ballots table if different */
	const ResultsSummary = JSON.stringify(summary)
	if (ResultsSummary !== ballot.ResultsSummary)
		await db.query('UPDATE ballots SET ResultsSummary=? WHERE BallotID=?', [ResultsSummary, ballotId])	

	ballot.Results = JSON.parse(ResultsSummary)
	delete ballot.ResultsSummary;
	delete ballot.results;
	//console.log(ballot)

	if (user.Access < AccessLevel.WGAdmin) {
		// Strip email addresses if user has insufficient karma
		results.forEach(r => {
			delete r.Email;
		});
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

export function deleteResults(ballotId) {
	return db.query(
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
	return getResults(user, ballotId);
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
		const result = await getResults(user, ballotId)
		results = [result]	// turn parameter into an array
	}
	else if (params.hasOwnProperty('BallotIDs')) {
		const ballotIds = params.BallotIDs
		fileNamePrefix = ballotIds.join('_')
		results = await Promise.all(ballotIds.map(ballotId => getResults(user, ballotId)))
	}
	else if (params.hasOwnProperty('Project')) {
		const project = params.Project
		fileNamePrefix = project
		results = await db.query('SELECT BallotID FROM ballots WHERE Project=?', [project])
		results = await Promise.all(results.map(r => getResults(user, r.BallotID)))
	}
	else {
		throw 'Missing parameter BallotID, BallotIDs or Project'
	}

	res.attachment(fileNamePrefix + '_results.xlsx')
	await genResultsSpreadsheet(results, res)
	res.end()
}
