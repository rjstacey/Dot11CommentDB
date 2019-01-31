//utils = require('./utils');
const csvParse = require('csv-parse/lib/sync')

function parsePollComments(startCommentId, pollComments) {
  var cid = startCommentId;

  // Row 0 is the header:
  // 'Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change'
  pollComments.shift();
  return pollComments.map(c => {
    var e = {};
    e.CommentID = cid++;
    e.Commenter = c[3];
    e.Comment = c[4];
    var pageText = c[6];
    var lineText = c[8];
    e.Page = /\d+/.exec(pageText)? /\d+/.exec(pageText)[0]: 0;  // digits from pageText or 0
    if (/\d+/.test(lineText)) {
        var line = /\d+/.exec(lineText)[0];
        e.Page += (line < 10? '.0': '.') + line;
    }
    e.Category = c[5]? c[5].charAt(0): '';   // First letter only (G, T or E)
    e.Clause = c[7];
    e.ProposedChange = c[9];
    e.MustSatisfy = !!c[10] === 1;
    return e;
  })
}

module.exports = function (db, rp) {
	var module = {};

	module.getAll = function (req, res, next) {
		var ret = {status: "Error", message: "Unknown server error"};

    console.log(req.query)

    var where = '';
    if (req.query.hasOwnProperty('BallotID')) {
      if (Array.isArray(req.query.BallotID)) {
        where = ` WHERE BallotID IN (${db.escape(req.query.BallotID.join())})`;
      }
      else {
        where = ` WHERE BallotID=${db.escape(req.query.BallotID)}`;
      }
    }

    var SQL = `SELECT * FROM comments${where}; SELECT * FROM resolutions${where};`
		console.log(SQL);
		db.query2(SQL)
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
        res.status(200).send({
          status: 'OK',
          data: comments
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
	}

	module.updateComment = (req, res, next) => {
    console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID') || !req.body.hasOwnProperty('CommentID')) {
      ret.message = 'Missing BallotID and/or CommentID';
      res.status(200).send(ret);
      return;
    }

    const ballotId = req.body.BallotID;
    const commentId = req.body.CommentID;
    delete req.body.BallotID;
    delete req.body.CommentID;

    if (req.body.hasOwnProperty('resolutions')) {
      // If there are resolutions then they may need to be inserted or updated
      if (!Array.isArray(req.body.resolutions)) {
        ret.message = 'Expected array for resolutions';
        res.status(200).send(ret);
        return;
      }
      var resolutions = req.body.resolutions;
      delete req.body.resolutions;

      // Need to know what is already present
      db.query2('SELECT * FROM resolutions WHERE (BallotID=? AND CommentID=?)', [ballotId, commentId])
        .then(results => {
          console.log('we have: ', results)

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
        .then((results) => {
          res.status(200).send({
            status: 'OK',
            data: results
          });
        })
        .catch(err => {
          ret.message = JSON.stringify(err);
          res.status(200).send(ret);
        })
    }
    else if (Object.keys(req.body).length !== 0) {
      db.query2("UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)", [req.body, ballotId, commentId])
        .then(results => {
          res.status(200).send({
            status: 'OK',
            data: results
          });
        })
        .catch(err => {
          res.status(200).send({
            status: 'Error',
            message: JSON.stringify(err)
          });
        });
    }
    else {
      // Nothing to do
      res.status(200).send({status: 'OK'});
    }
	}

  module.updateResolution = (req, res, next) => {
    console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID') ||
        !req.body.hasOwnProperty('CommentID') ||
        !req.body.hasOwnProperty('ResolutionID')) {
      res.status(200).send({
        status: 'Error',
        message: 'Missing BallotID, CommentID and/or ResolutionID'
      });
      return;
    }

    var ballotId = req.body.BallotID;
    var commentId = req.body.CommentID;
    var resolutionId = req.body.ResolutionID;
    delete req.body.BallotID;
    delete req.body.CommentID;
    delete req.body.ResolutionID;

    db.query2("UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)",
          [req.body, ballotId, commentId, resolutionId])
      .then(results=> {
        res.status(200).send({
          status: 'OK',
          data: results
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
  }

  module.addResolution = (req, res, next) => {
    console.log('addResolution', req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID') ||
        !req.body.hasOwnProperty('CommentID') ||
        !req.body.hasOwnProperty('ResolutionID')) {
      res.status(200).send({
        status: 'Error',
        message: 'Missing BallotID, CommentID and/or ResolutionID'
      });
      return;
    }

    db.query2('INSERT INTO resolutions SET ?', [req.body])
      .then(results => {
        res.status(200).send({
          status: 'OK',
          data: results
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      })
  }
  
  module.deleteByBallotID = function (req, res, next) {
    console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    const ballotid = db.escape(req.body.BallotID);
    var SQL = `DELETE FROM comments WHERE BallotID=${ballotid}`;
    console.log(SQL);
    db.query2(SQL)
      then(result => {
        console.log('return result', result)
        res.status(200).send({
          status: 'OK',
          data: result
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: typeof err === 'string'? err: JSON.stringify(err)
        });
      });
  }

  module.importComments = function (req, res, next) {
    console.log(req.body);

    if (!req.body.hasOwnProperty('BallotID') ||
      !req.body.hasOwnProperty('EpollNum') ||
      !req.body.hasOwnProperty('StartCID')) {
      res.status(200).send({
        status: 'Error',
        message: "Missing parameter. Need BallotID, EpollNum and StartCID."
      });
      return;
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
    rp.get(options)
      .then(ieeeRes => {

        console.log(ieeeRes.headers);

        if (ieeeRes.headers['content-type'] !== 'text/csv') {
          throw 'Not logged in'
        }

        var pollComments = csvParse(ieeeRes.body);
        if (pollComments.length === 0 || pollComments[0].length < 10) {
          throw pollComments.length === 0?
              'Got empty poll-comments.csv':
              `Unexpected number of columns ${pollComments[0].length} in poll-comments.csv`
        }

        var comments = parsePollComments(startCommentId, pollComments);
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
          .then(result => {
            console.log('return comments')
            return {count: comments.length}
          })
          .catch(err => {
            throw err.code === ER_DUP_ENTRY? "Entry already exists with this ID": err
          });
      })
      .then(result => {
        console.log('return result', result)
        res.status(200).send({
          status: 'OK',
          data: result
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: typeof err === 'string'? err: JSON.stringify(err)
        });
      });
  }

	return module;
}