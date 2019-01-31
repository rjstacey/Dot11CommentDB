
const csvParse = require('csv-parse/lib/sync')


function parsePollResults(csvArray) {
	// Row 0 is the header:
	// 'SA PIN', 'Date', 'Vote', 'Email'
	csvArray.shift();
	return csvArray.map(c => {
		return {
			SAPIN: c[0],
			Vote: c[2],
			Email: c[3]
		}
	});
}


module.exports = function(db, rp) {
	var module = {};

	module.getResults = function (req, res, next) {
		const sess = req.session;

		var where = '';
		if (req.query.hasOwnProperty('BallotID')) {
			if (Array.isArray(req.query.BallotID)) {
				where = ` WHERE BallotID IN (${db.escape(req.query.BallotID.join())})`;
			}
			else {
				where = ` WHERE BallotID=${db.escape(req.query.BallotID)}`;
			}
		}

		// Get all the ballots and count the number of comments associated with each ballot
		const SQL = `SELECT * FROM results${where};`;
		db.query2(SQL)
			.then(results => {
				res.status(200).send({
					status: 'OK',
					data: results
				});
			})
			.catch(err => {
				console.log(err);
				res.status(200).send({
					status: 'Error',
					essage: JSON.stringify(err)
				});
			});
	}

	module.deleteResults = function (req, res, next) {
		console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    var where = '';
    if (req.body.hasOwnProperty('BallotID')) {
      if (Array.isArray(req.query.BallotID)) {
        where = ` WHERE BallotID IN (${db.escape(req.body.BallotID.join())})`;
      }
      else {
        where = ` WHERE BallotID=${db.escape(req.body.BallotID)}`;
      }
    }
    else {
      res.status(200).send({
        status: 'Error',
        message: 'Missing parameter BallotID'
      });
      return;
    }

    var SQL = `DELETE FROM results${where}`;
    console.log(SQL);
    db.query2(SQL)
      .then(results => {
        res.status(200).send({status: 'OK'});
      })
      .catch(err => {
        console.log(err);
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
  }

	module.importResults = (req, res, next) => {
		console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID') ||
      !req.body.hasOwnProperty('EpollNum')) {
      res.status(200).send({
        status: 'Error',
        message: 'Missing parameter BallotID and/or EpollNum.'
      });
      return;
    }
    
    var ballotId = req.body.BallotID;
    var epollNum = req.body.EpollNum;

    const sess = req.session;

    var options = {
      url: `https://mentor.ieee.org/802.11/poll-results.csv?p=${epollNum}`,
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

        var pollResults = csvParse(body);
        if (pollResults.length === 0 || pollResults[0].length < 4) {
          throw pollResults.length === 0?
              'Got empty poll-results.csv':
              `Unexpected number of columns ${pollResults[0].length} in poll-results.csv`
        }

        var results = parsePollResults(pollResults);
        //console.log(comments);

        if (results.length === 0) {
          return {Count: 0};
        }

        var SQL = `INSERT INTO results (BallotID, ${Object.keys(results[0])}) VALUES`;
        results.forEach((c, i) => {
          SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
        });
        SQL += ";\n";
        //console.log(SQL);

        return db.query2(SQL)
          .then(results => {
            return {Count: results.length};
          })
          .catch(err => {
            throw err.code === ER_DUP_ENTRY? "Entry already exists with this ID": err
          });
      })
      .then(result => {
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

  module.summarizeResults = (req, res, next) => {
    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID')) {
      ret.message = "Missing parameter BallotID"
      res.status(200).send(ret);
      return;
    }
    
    var ballotId = req.body.BallotID;

    SQL = 'SELECT COUNT(*) FROM results WHERE Vote LIKE "Approve" AND BallotID=${ballotID} AS Y,' +
      'SELECT COUNT(*) FROM results WHERE Vote LIKE "Disapprove" AND BallotID=${ballotID} AS N,' +
      'SELECT COUNT(*) FROM results WHERE Vote LIKE "Abstain" AND BallotID=${ballotID} AS A;';
    db.query2(SQL)
      .then(result => {
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