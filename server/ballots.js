utils = require('./utils');
var cheerio = require('cheerio');

module.exports = function(db, request) {
	var module = {};

	module.getAll = function (req, res, next) {
		console.log('Request for ' + req.url);

  		var sess = req.session;
  		sess.views = (sess.views || 0) + 1;

  		var ret = {status: "Error", message: "Unknown server error"};

  		// Get all the ballots and count the number of comments associated with each ballot
  		const SQL_STRING = 'SELECT b.*, (SELECT COUNT(*) FROM comments AS c WHERE c.BallotID = b.BallotID) AS count FROM ballots AS b;';

  		db.query(SQL_STRING, function (err, results) {
    		if (err) {
      			ret.message = JSON.stringify(err);
      			console.log(err);
      			return res
        			.status(200)
        			.send(ret);
    		}
    		console.log(`Send ${JSON.stringify(results)}`);
    		ret.status = 'OK';
    		ret.message = '';
    		ret.views = sess.views;
    		ret.data = results;
    		return res
      			.status(200)
      			.send(ret);
  		});
	}

	module.add = function (req, res, next) {
		console.log('Add for '+ req.url);
		console.log(req.body);

		var {BallotID, BallotSeries, Topic, Start, End, Votes, EpollNum} = req.body;

		var ret = {status: "Error", message: "Unknown server error"};

    var SQL = "INSERT INTO ballots (BallotID, BallotSeries, Topic, Start, End, Result, EpollNum) VALUES (?, ?, ?, ?, ?, ?, ?)";
		db.query(SQL,
        [BallotID, BallotSeries, Topic, Start, End, Votes, EpollNum],
        (err, result) => {
      		if (err) {
        			console.log(err.message);
        			ret.message = JSON.stringify(err);
        			if (err.code == 'ER_DUP_ENTRY') {
          			ret.message = "An entry already exists with this ID";
        			}
        			return res
          			.status(200)
          			.send(ret);
      		}
      		console.log('Last insert ID:', result.insertId)
      		ret.status = 'OK';
      		ret.message = '';
          ret.data = {BallotID, BallotSeries, Topic, Start, End, Votes, EpollNum};
      		return res
        			.status(200)
        			.send(ret);
		});
	}

	module.update = function (req, res, next) {
		console.log('Update for '+ req.url);
		console.log(req.body);
		var id = req.body['BallotID'];
		delete req.body['BallotID'];
		console.log(req.body);

		var ret = {status: "Error", message: "Unknown server error"};

		db.query("UPDATE ballots SET ? WHERE BallotID=?",  [req.body, id], function(err, result) {
  		if (err) {
    			console.log(err.message);
    			ret.message = JSON.stringify(err);

    			return res
      			.status(200)
      			.send(ret);
  		}
  		ret.status = 'OK';
  		ret.message = '';
  		return res
    			.status(200)
    			.send(ret);
		});
	}

	module.delete = function (req, res, next) {
		console.log('Delete for '+ req.url);
  	console.log(req.body);

  	var ballotids = req.body;

  	var ret = {status: "Error", message: "Unknown server error"};

  	var SQL = 'START TRANSACTION;\n';
  	SQL += `DELETE FROM ballots WHERE BallotID IN (?);\n`;
  	SQL += `DELETE FROM comments WHERE BallotID IN (?);\n`;
  	SQL += 'COMMIT;'
  	db.query(SQL, [ballotids, ballotids], function(err, result) {
  		if (err) {
      	console.log(err.message);
      	ret.message = JSON.stringify(err);
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

  module.getEpolls = (req, res, next) => {
    var ret = {status: "Error", message: "Unknown server error"};

    const sess = req.session;
    console.log(sess.ieeeCookieJar);

    // Get a list of ballot IDs in the database
    var SQL_STRING = 'SELECT EpollNum FROM `ballots`;';
    db.query(SQL_STRING, function (err, results) {
      if (err) {
        console.log('Error ' + err);
        ret.message = JSON.stringify(err);
        res.send(ret);
        return next(err);
      }
      var idList = [];
      for (var i = 0; i < results.length; i++) {
        idList.push(results[i].EpollNum);
      }
      //console.log(idList);

      var options = {
        url: 'https://mentor.ieee.org/802.11/polls/closed',
        jar: sess.ieeeCookieJar
      }
      request
        .get(options, (err, response, body) => {
    
          if (err) {
            ret.message = err.message;
            res.send(ret);
            return next(err);
          }
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
              epoll.End = $(tds.eq(4)).children().eq(0).text();   // <div class="date_time">
              epoll.Votes = tds.eq(5).text();
              var p = tds.eq(7).html().match(/poll-status\?p=(\d+)/);
              epoll.EpollNum = p? p[1]: '';
              epoll.InDatabase = (idList.indexOf(epoll.EpollNum) >= 0); // determine if ballot is already present in database
              epolls.push(epoll);
            });
            console.log(epolls);
            ret.data = epolls;
            ret.status = 'OK';
            ret.message = '';
            return res
              .status(200)
              .send(ret);
          }

          console.log('Did not get ePolls page');
          console.log(body);

          // If we get the "Sign In" page then the user is not logged in
          if ($('div.title').length && $('div.title').html() == "Sign In") {
            ret.message = "Not logged in";
          }
          else {
            ret.message = "Unexpected page returned by mentor.ieee.org";
          }
          return res
            .status(200)
            .send(ret);
        });
      });
  }

	return module;
}