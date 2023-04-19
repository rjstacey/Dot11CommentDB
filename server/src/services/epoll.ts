/*
 * ePoll HTML scraping
 */

import { DateTime } from 'luxon';
import cheerio from 'cheerio';
import { csvParse } from '../utils';

// Convert date string to UTC
function parseDateTime(dateStr: string) {
	// Date is in format: "11-Dec-2018 23:59:59 ET" and is always eastern time
	dateStr = dateStr.substr(0, 20);
	return DateTime.fromFormat(dateStr, 'dd-MMM-yyyy HH:mm:ss', {zone: 'America/New_York'}).toISO();
}

type Epoll = {
	BallotID: string;
	Start: string;
	End: string;
	Topic: string;
	Document: string;
	Votes: string;
	EpollNum: string;
}

function parseClosedEpollsPage(body: string): Epoll[] {
	var epolls: Epoll[] = [];
	var $ = cheerio.load(body);
          
	// If we get the "ePolls" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "ePolls") {
		//console.log('GOT ePolls page');
		$('.b_data_row').each(function (index) {  // each table data row
			let tds = $(this).find('td');
			let pollStatusLink = tds.eq(7).html() || '';
			let p = pollStatusLink.match(/poll-status\?p=(\d+)/);
			let epoll: Epoll = {
				Start: parseDateTime($(tds.eq(0)).children().eq(0).text()), // <div class="date_time">
				BallotID: tds.eq(1).text(),
				Topic: $(tds.eq(2)).children().eq(0).text(), // <p class="prose">
				Document: $(tds.eq(3)).children().eq(0).text(),
				End: parseDateTime($(tds.eq(4)).children().eq(0).text()),   // <div class="date_time">
				Votes: tds.eq(5).text(),
				EpollNum: p? p[1]: '',
			};
			epolls.push(epoll);
		});
    	return epolls;
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new Error('Not logged in');
	}
	else {
		throw new Error('Unexpected page returned by mentor.ieee.org');
	}
}

/*
 * getEpolls
 *
 * Parameters: n = number of entries to get
 */
export async function getEpolls(user, n) {
	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new Error('Not logged in');

	async function recursivePageGet(epolls, n, page) {
		//console.log('get epolls n=', n)

		const {data} = await ieeeClient.get(`https://mentor.ieee.org/802.11/polls/closed?n=${page}`);

		var epollsPage = parseClosedEpollsPage(data);
		var end = n - epolls.length;
		if (end > epollsPage.length) {
			end = epollsPage.length;
		}
		epolls = epolls.concat(epollsPage.slice(0, end));

		if (epolls.length === n || epollsPage.length === 0) {
			//console.log('send ', epolls.length);
			return epolls;
		}

		return recursivePageGet(epolls, n, page+1);
	}

	return recursivePageGet([], n, 1);
}

type PageResult = {
	Vote: string;
	Name: string;
	Email: string;
	Affiliation: string;
}

export function parseEpollResultsHtml(body: string) {
	var $ = cheerio.load(body);
	// If we get the "ePoll Status" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "ePoll Status") {
		var results: PageResult[] = [];
		$('table.paged_list').eq(0).find('tr.b_data_row').each(function(index, el) {
			var tds = $(this).find('td');
			let emailLink = $(tds.eq(2)).children().eq(0).attr('href') || '';
			var result = {
				Vote: tds.eq(1).text(),
				Name: tds.eq(2).text(),
				Email: unescape(emailLink.replace('mailto:', '')),
				Affiliation: tds.eq(3).text()
			};
			//console.log(result)
			results.push(result);
		})
		return results
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new Error('Not logged in');
	}
	else {
		throw new Error('Unexpected page returned by mentor.ieee.org');
	}
}

const epollCommentsHeader = [
	'Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change'//, 'Must Be Satisfied'
];

type CSVComment = {
	CommentID: number;
	C_Index: number;
	CommenterSAPIN: number;
	CommenterName: string;
	Comment: string;
	Category: string;
	C_Page: string;
	C_Clause: string;
	C_Line: string;
	Page: number;
	Clause: string;
	ProposedChange: string;
	MustSatisfy: boolean;
}

export async function parseEpollCommentsCsv(buffer: Buffer, startCommentId: number): Promise<CSVComment[]> {
	let cid = startCommentId;

	const p: any[] = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty CSV file');

	// Row 0 is the header
	if (epollCommentsHeader.reduce((r, v, i) => r || v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${epollCommentsHeader.join()}.`);
	p.shift();

	const comments = p.map(c => {
		let C_Page = c[6]? c[6].trim(): '';
		let C_Line = c[8]? c[8].trim(): '';
		let Page = parseFloat(C_Page) + parseFloat(C_Line)/100;
		if (isNaN(Page)) 
			Page = 0;
		return {
			CommentID: cid++,
			C_Index: parseInt(c[0]),
			CommenterSAPIN: c[2],
			CommenterName: c[3],
			Comment: c[4],
			Category: c[5]? c[5].charAt(0): 'T',   // First letter only (G, T or E), T if blank
			C_Page,
			C_Clause: c[7]? c[7].trim(): '',
			C_Line,
			Page,
			Clause: c[7]? c[7]: '',
			ProposedChange: c[9]? c[9]: '',
			MustSatisfy: !!(c[10] === '1')
		};
	});

	return comments;
}

const epollResultsHeader = [
	'SA PIN', 'Date', 'Vote', 'Email'
];

type CSVResult = {
	SAPIN: number;
	Email: string;
	Vote: string;
}

export async function parseEpollResultsCsv(buffer: Buffer): Promise<CSVResult[]> {

	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});
	if (p.length === 0)
		throw new Error('Empty CSV file');

	// Row 0 is the header
	if (epollResultsHeader.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${epollResultsHeader.join()}.`);
	p.shift();

	return p.map(c => ({
		SAPIN: Number(c[0]),
		//Date: c[1],
		Vote: c[2],
		Email: c[3]
	}));
}
