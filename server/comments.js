utils = require('./utils');

module.exports = function (db, request) {
	var module = {};

	module.getAll = function (req, res, next) {
		var ret = {status: "Error", message: "Unknown server error"};

    var SQL = 'SELECT * FROM comments';
    console.log(req.query)
    if (req.query.hasOwnProperty('BallotID')) {
      if (Array.isArray(req.query.BallotID)) {
        const ballotids = req.query.BallotID.join();
        SQL += ' WHERE BallotID IN (' + db.escape(ballotids) + ')';
      }
      else {
        SQL += ' WHERE BallotID=' + db.escape(req.query.BallotID);
      }
    }
		console.log(SQL);
		db.query(SQL, (err, results, fields) => {
  		if (err) {
    			ret.message = err;
    			return res
      			.status(200)
      			.send(ret);
  		}

  		ret.status = 'OK';
  		ret.message = '';
  		ret.data = results;
      console.log(results)
  		return res
    			.status(200)
    			.send(ret);
		});
	}

	module.update = function (req, res, next) {
    console.log(req.body);

  	db.query("UPDATE comments SET Commenter='" + req.body.Commenter + "' WHERE CID=" + req.body.CID);

  	return res
    		.status(200)
    		.send();
	}

  module.delete = function (req, res, next) {
    console.log(req.body);
    
    var ret = {status: "Error", message: "Unknown server error"};

    const list = req.body;
    db.query(
      "DELETE FROM comments WHERE BallotID IN (?)",
      [ballotids],
      (err, results, fields) => {
        if (err) {
          ret.message = err;
        }
        else {
          ret.status = "OK";
          ret.message = "";
        }
        return res
          .status(200)
          .send(ret);
      });
  }

  module.deleteByBallotID = function (req, res, next) {
    console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    const ballotid = db.escape(req.body.BallotID);
    var SQL = `DELETE FROM comments WHERE BallotID=${ballotid}`;
    console.log(SQL);
    db.query(SQL, (err, results, fields) => {
      if (err) {
        ret.message = err;
      }
      else {
        ret.status = "OK";
        ret.message = "";
      }
      return res
        .status(200)
        .send(ret);
    });
  }

  module.import = function (req, res, next) {
    console.log(req.body);

    var ret = {status: "Error", message: "Unknown server error"};

    if (!req.body.hasOwnProperty('BallotID') ||
      !req.body.hasOwnProperty('EpollNum') ||
      !req.body.hasOwnProperty('StartCID')) {
      ret.message = "Missing parameter. Need BallotID, EpollNum and StartCID."
      return res
        .status(200)
        .send(ret);
    }
    
    var id = req.body.BallotID;
    var cid = req.body.StartCID || 1;
    var epollNum = req.body.EpollNum;

    const sess = req.session;

    var options = {
      url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
      jar: sess.ieeeCookieJar
    }
    request
      .get(options, (err, response, body) => {

        console.log(response.headers);

        if (response.headers['content-type'] !== 'text/csv') {
          ret.message = 'Not logged in';
          return res
            .status(200)
            .send(ret);
        }

        if (err) {
          ret.message = err;
          return res
              .status(200)
              .send(ret);
        }

        var csvArray = utils.CSVToArray(body);
        var comments = [];
        var len = csvArray.length;
        if (len > 4) {len = 4}

        // Skip row 0 in .csv file since this is the header
        for (var i = 1; i < len; i++) {
          var e = {
              commenter: '',
              pageText: '',
              lineText: ''
          };
          e.cid = cid++;
          e.commenter = csvArray[i][3];
          e.comment = csvArray[i][4];
          e.pageText = csvArray[i][6];
          e.lineText = csvArray[i][8];
          e.clauseText = csvArray[i][7];
          e.page = /\d+/.exec(e.pageText)? /\d+/.exec(e.pageText)[0]: 0;  // digits from pageText or 0
          if (/\d+/.test(e.lineText)) {
              var line = /\d+/.exec(e.lineText)[0];
              e.page += (line < 10? '.0': '.') + line;
          }
          e.category = csvArray[i][5].charAt(0);   // First letter only (G, T or E)
          e.clause = e.clauseText;
          e.proposedChange = csvArray[i][9];
          e.mustSatisfy = csvArray[i][10] == 1? true: false;
          comments.push([id, e.cid, e.commenter, e.page, e.clause, e.category, e.comment, e.proposedChange, e.mustSatisfy]);
        }

        console.log(comments);

        if (comments.length == 0) {
          ret.status = "OK";
          ret.message = "";
          ret.data = {count: 0};
          return res
              .status(200)
              .send(ret);
        }

        var SQL = "INSERT INTO comments (BallotID, CommentID, Commenter, Page, Clause, Category, Comment, ProposedChange, MustSatisfy) VALUES";
        for (var i = 0; i < comments.length; i++) {
          SQL += i > 0? ',': '';
          SQL += '(' + db.escape(comments[i]) + ')';
        }
        SQL += ";\n";
        console.log(SQL);

        db.query(SQL, function(err, result) {
          if (err) {
              console.log(err.message);
              ret.message = err.message;
              if (err.code == 'ER_DUP_ENTRY') {
                ret.message = "Entry already exists with this ID";
              }
          }
          else {
            ret.status = "OK";
            ret.message = "";
            ret.data = {count: comments.length};
          }
          return res
              .status(200)
              .send(ret);
        });

    });
  }

	return module;
}