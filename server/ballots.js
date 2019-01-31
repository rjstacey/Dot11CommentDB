var cheerio = require('cheerio');


function parseClosedEpollsPage(body) {
  var epolls = [];
  var $ = cheerio.load(body);
          
  // If we get the "ePolls" page then parse the data table
  // (use cheerio, which provides jQuery parsing)
  if ($('div.title').length && $('div.title').html() == "ePolls") {
    console.log('GOT ePolls page');
    $('.b_data_row').each(function (index) {  // each table data row
      var epoll = {};
      var tds = $(this).find('td');
      epoll.Start = $(tds.eq(0)).children().eq(0).text(); // <div class="date_time">
      epoll.BallotID = tds.eq(1).text();
      epoll.Topic = $(tds.eq(2)).children().eq(0).text(); // <p class="prose">
      epoll.Document = $(tds.eq(3)).children().eq(0).text();
      epoll.End = $(tds.eq(4)).children().eq(0).text();   // <div class="date_time">
      epoll.Votes = tds.eq(5).text();
      var p = tds.eq(7).html().match(/poll-status\?p=(\d+)/);
      epoll.EpollNum = p? p[1]: '';
      epolls.push(epoll);
    });
    return {errMsg: null, epolls};
  }
  else if ($('div.title').length && $('div.title').html() == "Sign In") {
    // If we get the "Sign In" page then the user is not logged in
    return {errMsg: "Not logged in", epolls: []};
  }

  return {errMsg: "Unexpected page returned by mentor.ieee.org", epolls: []};
}

function parsePollResults(csvArray) {
  // Row 0 is the header:
  // 'SA PIN', 'Date', 'Vote', 'Email'
  csvArray.shift();
  return csvArray.map(c => {
    return {
      SAPIN: c[0],
      Date: c[1],
      Vote: c[2],
      Email: c[3]
    }
  });
}


module.exports = function(db, rp) {
	var module = {};

	module.getAll = (req, res, next) => {
		console.log('Request for ' + req.url);

		var ret = {};

		var sess = req.session;

		// Get all the ballots and count the number of comments associated with each ballot
		const SQL = 'SELECT b.*, ' +
			'(SELECT COUNT(*) FROM voters AS v WHERE v.BallotSeries = b.BallotSeries) AS VoterCount, ' +
			'(SELECT COUNT(*) FROM comments AS c WHERE c.BallotID = b.BallotID) AS CommentCount, ' +
			'(SELECT COUNT(*) FROM results AS r WHERE r.BallotID = b.BallotID AND r.Vote LIKE "Approve") AS Approve, ' +
			'(SELECT COUNT(*) FROM results AS r WHERE r.BallotID = b.BallotID AND r.Vote LIKE "Disapprove") AS Disapprove, ' +
			'(SELECT COUNT(*) FROM results AS r WHERE r.BallotID = b.BallotID AND r.Vote LIKE "Abstain%") AS Abstain ' +
			'FROM ballots AS b;';
		db.query2(SQL)
			.then(results => {
 				results.forEach(r => {
					r.Result = `${r.Approve}/${r.Disapprove}/${r.Abstain}`;
				})
				console.log(`Send ${JSON.stringify(results)}`);
				res.status(200).send({
 					status: 'OK',
					data: results
				});
			})
			.catch(err => {
				console.log(err);
				res.status(200).send({
					status: 'Error',
					message: JSON.stringify(err)
				});
			});
	}

	module.add = (req, res, next) => {
		console.log('Add for '+ req.url);
		console.log(req.body);

    entry = {
      BallotID: req.body.BallotID,
      Project: req.body.Project,
      Document: req.body.Document,
      Topic: req.body.Topic,
      Start: req.body.Start,
      End: req.body.End,
      EpollNum: req.body.EpollNum
    }

    var SQL = `INSERT INTO ballots (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))})`;
		db.query2(SQL)
      .then(result => {
        res.status(200).send({
          status: 'OK',
          data: req.body
        });
      })
      .catch(err => {
        console.log(err.message);
        var ret = {status: 'Error'};
        if (err.code == 'ER_DUP_ENTRY') {
          ret.message = "An entry already exists with this ID";
        }
        else {
          ret.message = JSON.stringify(err);
        }
        res.status(200).send(ret);
      });
	}

	module.update = (req, res, next) => {
		console.log('Update for '+ req.url);
		console.log(req.body);
		var id = req.body['BallotID'];
		delete req.body['BallotID'];
		console.log(req.body);

		var ret = {status: "Error", message: "Unknown server error"};

		db.query2("UPDATE ballots SET ? WHERE BallotID=?",  [req.body, id])
      .then(result => {
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

	module.delete = (req, res, next) => {
		console.log('Delete for '+ req.url);
  	console.log(req.body);

  	var ballotids = req.body;

  	var SQL = 'START TRANSACTION;' +
  	 `DELETE FROM ballots WHERE BallotID IN (?);` +
  	 `DELETE FROM comments WHERE BallotID IN (?);` +
  	 'COMMIT;'
  	db.query2(SQL, [ballotids, ballotids])
      .then(result => {
        res.status(200).send({status: 'OK'});
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
	}

  /*
   * getEpolls
   *
   * Parameters: n = number of entries to get
   */
  module.getEpolls = (req, res, next) => {
    var ret = {status: "Error", message: "Unknown server error"};

    const sess = req.session;
    console.log(sess);

    var n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0;

    // Get a list of ballot IDs in the database
    db.query2('SELECT EpollNum FROM ballots')
      .then(results => {

        // Convert rusults to an array
        const idList = results.map(r => r.EpollNum);

        //console.log(idList);
        function recursivePageGet(epolls, n, page) {
          console.log('get epolls n=', n)

          var options = {
            url: `https://mentor.ieee.org/802.11/polls/closed?n=${page}`,
            jar: sess.ieeeCookieJar
          }
          console.log(options.url);

          return rp.get(options)
            .then(body => {
              console.log(body)
              var r = parseClosedEpollsPage(body);
              if (r.errMsg) {
                 return Promise.reject(r.errMsg);
              }

              var end = n - epolls.length;
              if (end > r.epolls.length) {
                end = r.epolls.length;
              }
              epolls = epolls.concat(r.epolls.slice(0, end));

              if (epolls.length === n || r.epolls.length === 0) {
                // determine if ballot is already present in database
                epolls.forEach(epoll => epoll.InDatabase = idList.includes(epoll.EpollNum));
                console.log('send ', epolls.length);
                return Promise.resolve(true);
              }

              return Promise.resolve(false);
            })
            .then(done => done? epolls: recursivePageGet(epolls, n, page+1));
        }

        return recursivePageGet([], n, 1);
      })
      .then(epolls => {
        res.status(200).send({
          status: 'OK',
          data: epolls
        });
      })
      .catch(err => {
        console.log(err);
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
  }

	return module;
}