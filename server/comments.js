var csvParse = require('csv-parse/lib/sync');
var xlsx = require('xlsx');

function parsePollComments(startCommentId, pollCommentsCsv) {
	var cid = startCommentId;

	const p = csvParse(pollCommentsCsv, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-comments.csv';
	}

	// Row 0 is the header
	expected = ['Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change', 'Must Be Satisfied'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		var e = {
			CommentID: cid++,
			SAPIN: c[2],
			Name: c[3],
			Comment: c[4],
			Page: parseFloat(c[6]) + parseFloat(c[8])/100,
			Category: c[5]? c[5].charAt(0): '',   // First letter only (G, T or E)
			Clause: c[7],
			ProposedChange: c[9],
			MustSatisfy: !!(c[10] === '1')
		};
		if (isNaN(e.Page)) {e.Page = 0}
		return e;
	})
}

module.exports = function (db, rp) {
	var module = {};

	module.getComments = function (req, res, next) {
		console.log(req.query)

		const ballotId = req.query.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}

		const SQL = 
			'SELECT c.*, r.Vote FROM comments AS c LEFT JOIN results AS r ON (c.BallotID = r.BallotID AND c.SAPIN = r.SAPIN) WHERE c.BallotID = ?; ' +
			'SELECT r.*, u.Name AS AssigneeName FROM resolutions AS r LEFT JOIN users AS u ON (r.Assignee = u.UserID) WHERE BallotID = ?;'
		console.log(SQL);
		return db.query2(SQL, [ballotId, ballotId])
			.then(results => {
				// Join the comments and resolutions tables. Each comment has an array of resolutions.
				var comments = results[0];
				var resolutions = results[1];
				comments.forEach(c => {
					c.resolutions = [];
					resolutions.forEach(r => {
						if (c.BallotID === r.BallotID && c.CommentID === r.CommentID) {
							delete r.BallotID;
							delete r.CommentID;
							c.resolutions.push(r);
						}
					})
				})
				return comments
			})
	}

	module.updateComment = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') || !req.body.hasOwnProperty('CommentID')) {
			return Promise.reject('Missing BallotID and/or CommentID');
		}

		const ballotId = req.body.BallotID;
		const commentId = req.body.CommentID;
		delete req.body.BallotID;
		delete req.body.CommentID;

		if (req.body.hasOwnProperty('resolutions')) {
			// If there are resolutions then they may need to be inserted or updated
			if (!Array.isArray(req.body.resolutions)) {
				return Promise.reject('Expected array for resolutions');
			}
			var resolutions = req.body.resolutions;
			delete req.body.resolutions;

			// Need to know what is already present
			return db.query2('SELECT * FROM resolutions WHERE (BallotID=? AND CommentID=?)', [ballotId, commentId])
				.then(results => {
					// Each resolution entry is either an update or an insertion
					// an update if already present; an insertion if not present
					let queries = [];
					resolutions.forEach(r1 => {
						console.log('r1=', r1)
						let present = false;
						results.forEach(r2 => {
							if (r2.ResolutionID === r1.ResolutionID) {
								present = true;
							}
						})
						if (present) {
							// present so it is an update
							let resolutionId = r1.ResolutionID;
							delete r1.BallotID;
							delete r1.CommentID;
							delete r1.ResolutionID;
							if (Object.keys(r1).length !== 0) {
								queries.push(db.format('UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)', [r1, ballotId, commentId, resolutionId]));
							}
						}
						else {
							// not present so it must be an insert
							r1.BallotID = ballotId;
							r1.CommentID = commentId;
							queries.push(db.format('INSERT INTO resolutions SET ?', r1));
						}
					});

					// If there are additional changes to the comment, then make these too
					if (Object.keys(req.body).length !== 0) {
						queries.push(db.format('UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)', [req.body, ballotId, commentId]));
					}

					// It is possible that we end up with nothing to do
					if (queries.length === 0) {
						return Promise.resolve(null);
					}

					var query = queries.join(';');
					console.log(query);
					return db.query2(query);
				})
		}
		else if (Object.keys(req.body).length !== 0) {
			return db.query2("UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)", [req.body, ballotId, commentId]);
		}
		else {
			// Nothing to do
			return Promise.resolve(null);
		}
	}

	module.updateResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
			!req.body.hasOwnProperty('CommentID') ||
			!req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID');
		}

		var ballotId = req.body.BallotID;
		var commentId = req.body.CommentID;
		var resolutionId = req.body.ResolutionID;
		delete req.body.BallotID;
		delete req.body.CommentID;
		delete req.body.ResolutionID;

		return db.query2("UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)",
			[req.body, ballotId, commentId, resolutionId])
	}

	module.addResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID') ||
		    !req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID')
		}

		return db.query2('INSERT INTO resolutions SET ?', [req.body])
	}

	module.deleteResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID') ||
		    !req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID')
		}

		return db.query2('DELETE FROM resolutions WHERE BallotID=? AND CommentID=? AND ResolutionID=?',
			[req.body.BallotID, req.body.CommentID, req.body.ResolutionID])
	}
  
	module.deleteByBallotID = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		return db.query2('DELETE FROM comments WHERE BallotID=', [ballotId])
	}

	module.importComments = function (req, res, next) {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
			!req.body.hasOwnProperty('EpollNum') ||
			!req.body.hasOwnProperty('StartCID')) {
			return Promise.reject("Missing parameter. Need BallotID, EpollNum and StartCID.")
		}

		const ballotId = req.body.BallotID;
		const startCommentId = req.body.StartCID || 1;
		const epollNum = req.body.EpollNum;

		const sess = req.session;

		var options = {
			url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
			jar: sess.ieeeCookieJar,
			resolveWithFullResponse: true,
			simple: false
		}
		return rp.get(options)
			.then(ieeeRes => {
				console.log(ieeeRes.headers);
				if (ieeeRes.headers['content-type'] !== 'text/csv') {
					return Promise.reject('Not logged in')
				}

				var comments = parsePollComments(startCommentId, ieeeRes.body);
				console.log(comments);

				if (comments.length === 0) {
					console.log('no comments')
					return {count: 0}
				}

				var SQL = `INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES`;
				comments.forEach((c, i) => {
					SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
				});
				SQL += ";\n";
				//console.log(SQL);

				return db.query2(SQL)
					.then(result => {return comments.length})
			})
	}

	module.uploadComments = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		const startCommentId = req.body.StartCID || 1;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID')
		}

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file')
		}
		var comments = parsePollComments(startCommentId, req.file.buffer);
		//console.log(comments);

		if (comments.length === 0) {
			console.log('no comments')
			return {count: 0}
		}

		var SQL = `INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES`;
		comments.forEach((c, i) => {
			SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
		});
		SQL += ";\n";
		//console.log(SQL);

		return db.query2(SQL)
			.then(result => {
				console.log('return comments')
				return {count: comments.length}
			})
	}

	module.uploadResolutions = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}
		const sess = req.session;

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file');
		}
		var workbook = xlsx.read(req.file.buffer, {type: 'buffer'});
		console.log(workbook.SheetNames)
		var ws = workbook.Sheets[workbook.SheetNames[0]];
		var csv = xlsx.utils.sheet_to_csv(ws);
		var c = csvParse(csv, {columns: true});
		console.log(c[0])
	}

	return module;
}