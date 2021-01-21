/*
 * Handle ePoll CSV files
 */

const csvParse = require('csv-parse/lib/sync')

const epollCommentsHeader = [
	'Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change'//, 'Must Be Satisfied'
]

function parseEpollCommentsCsv(buffer, startCommentId) {
	var cid = startCommentId;

	const p = csvParse(buffer, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-comments.csv';
	}

	// Row 0 is the header
	if (epollCommentsHeader.reduce((r, v, i) => r || v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${epollCommentsHeader.join()}.`
	}
	p.shift();

	return p.map(c => {
		var e = {
			CommentID: cid++,
			C_Index: parseInt(c[0]),
			CommenterSAPIN: c[2],
			CommenterName: c[3],
			Comment: c[4],
			Category: c[5]? c[5].charAt(0): 'T',   // First letter only (G, T or E), T if blank
			C_Page: c[6]? c[6].trim(): '',
			C_Clause: c[7]? c[7].trim(): '',
			C_Line: c[8]? c[8].trim(): '',
			Page: parseFloat(c[6]) + parseFloat(c[8])/100,
			Clause: c[7]? c[7]: '',
			ProposedChange: c[9]? c[9]: '',
			MustSatisfy: !!(c[10] === '1')
		};
		if (isNaN(e.Page)) {e.Page = 0}
		return e;
	})
}

function parseEpollResultsCsv(buffer) {

	const p = csvParse(buffer, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-results.csv';
	}

	// Row 0 is the header
	const expected = ['SA PIN', 'Date', 'Vote', 'Email'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		return {
			SAPIN: c[0],
			//Date: c[1],
			Vote: c[2],
			Email: c[3]
		}
	});
}


export {
	parseEpollCommentsCsv,
	parseEpollResultsCsv
}