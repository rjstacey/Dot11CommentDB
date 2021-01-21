'use strict'

const db = require('../util/database')
const users = require('../services/users')

const usersTable =
	'CREATE TABLE `users` (' +
		'`SAPIN` int(32) NOT NULL,' +
		'`Access` int(1) NOT NULL DEFAULT "1" COMMENT "1 = View (participant, has IEEE login)\\n2 = Assign, Resolve (voting member)\\n3 = Reassign, Assign, Resolve (voting member, designated manager)\\n4 = Manage, Reassign, Assign, Resolve, Close (voting member, designated manager)",' +
 		'`Name` varchar(256) NOT NULL,' +
		'`LastName` varchar(128) DEFAULT NULL,' +
		'`FirstName` varchar(128) DEFAULT NULL,' +
		'`MI` varchar(45) DEFAULT NULL,' +
		'`Email` varchar(128) NOT NULL,' +
		'`Status` varchar(45) DEFAULT NULL,' +
		'PRIMARY KEY (`SAPIN`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const ballotsTable = 
	'CREATE TABLE `ballots` (' +
		'`BallotID` varchar(16) NOT NULL,' +
		'`Project` varchar(45) NOT NULL,' +
		'`Type` tinyint(4) DEFAULT NULL,' +
		'`Document` varchar(1024) NOT NULL,' +
		'`Topic` varchar(1024) NOT NULL,' +
		'`Start` datetime DEFAULT NULL,' +
		'`End` datetime DEFAULT NULL,' +
		'`EpollNum` varchar(128) DEFAULT NULL,' +
		'`VotingPoolID` varchar(45) NOT NULL,' +
		'`PrevBallotID` varchar(16) NOT NULL,' +
		'`ResultsSummary` varchar(4096) DEFAULT NULL,' +
		'PRIMARY KEY (`BallotID`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const commentsTable =
	'CREATE TABLE `comments` ('
		'`BallotID` varchar(16) NOT NULL,'
		'`CommentID` int(32) NOT NULL,'
		'`CommenterSAPIN` int(32) DEFAULT NULL,'
		'`CommenterEmail` varchar(128) DEFAULT NULL,'
		'`CommenterName` varchar(128) DEFAULT NULL,'
		'`MustSatisfy` tinyint(1) DEFAULT 0,'
		'`Category` varchar(1) DEFAULT NULL,'
		'`Clause` varchar(128) DEFAULT NULL,'
		'`Page` decimal(10,2) DEFAULT NULL,'
		'`Comment` varchar(4096) DEFAULT NULL,'
		'`ProposedChange` varchar(4096) DEFAULT NULL,'
		'`CommentGroup` varchar(128) DEFAULT NULL,'
		'`C_Page` varchar(45) DEFAULT NULL,'
		'`C_Line` varchar(45) DEFAULT NULL,'
		'`C_Clause` varchar(128) DEFAULT NULL,'
		'`C_Index` int(32) DEFAULT NULL,'
		'`AdHoc` varchar(128) DEFAULT NULL,'
		'PRIMARY KEY (`BallotID`,`CommentID`)'
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const resolutionsTable =
	'CREATE TABLE `resolutions` (' +
		'`BallotID` varchar(16) NOT NULL,' +
		'`CommentID` int(32) NOT NULL,' +
		'`ResolutionID` int(32) NOT NULL,' +
		'`AssigneeSAPIN` int(32) DEFAULT NULL,' +
		'`AssigneeName` varchar(256) DEFAULT NULL,' +
		'`ResnStatus` varchar(1) DEFAULT NULL,' +
		'`Resolution` varchar(4096) DEFAULT NULL,' +
		'`Submission` varchar(256) DEFAULT NULL,' +
		'`EditStatus` varchar(1) DEFAULT NULL,' +
		'`EditNotes` varchar(4096) DEFAULT NULL,' +
		'`EditInDraft` varchar(45) DEFAULT NULL,' +
		'`ReadyForMotion` tinyint(4) DEFAULT NULL,' +
		'`ApprovedByMotion` varchar(45) DEFAULT NULL,' +
		'`Notes` varchar(4096) DEFAULT NULL,' +
		'PRIMARY KEY (`BallotID`,`CommentID`,`ResolutionID`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const resultsTable =
	'CREATE TABLE `results` (' +
		'`BallotID` varchar(16) NOT NULL,' +
		'`SAPIN` int(32) NOT NULL,' +
		'`Email` varchar(128) NOT NULL,' +
		'`Name` varchar(128) DEFAULT NULL,' +
		'`Affiliation` varchar(128) DEFAULT NULL,' +
		'`Vote` varchar(64) DEFAULT NULL,' +
		'PRIMARY KEY (`BallotID`,`SAPIN`,`Email`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const saVotersTable =
	'CREATE TABLE `saVoters` (' +
		'`VotingPoolID` varchar(45) NOT NULL,' +
		'`Email` varchar(128) NOT NULL,' +
		'`Name` varchar(128) DEFAULT NULL,' +
		'PRIMARY KEY (`VotingPoolID`,`Email`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const wgVotersTable =
	'CREATE TABLE `wgVoters` (' +
		'`VotingPoolID` varchar(45) NOT NULL,' +
		'`SAPIN` int(32) NOT NULL,' +
		'`Email` varchar(128) DEFAULT NULL,' +
		'`LastName` varchar(128) DEFAULT NULL,' +
		'`FirstName` varchar(128) DEFAULT NULL,' +
		'`MI` varchar(45) DEFAULT NULL,' +
		'`Status` varchar(45) DEFAULT NULL,' +
		'PRIMARY KEY (`VotingPoolID`,`SAPIN`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const sessionsTable =
	'CREATE TABLE `sessions` (' +
		'`session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,' +
		'`expires` int(11) unsigned NOT NULL,' +
		'`data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,' +
		'PRIMARY KEY (`session_id`)' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8;'

const createTables = {
	'users': usersTable,
	'saVoters': saVotersTable,
	'wgVoters': wgVotersTable,
	'ballots': ballotsTable,
	'comments': commentsTable,
	'resolutions': resolutionsTable,
	'results': resultsTable,
	'sessions': sessionsTable
}

const superUser = {
	SAPIN: 5073,
	Name: 'Robert Stacey',
	Email: 'rjstacey@gmail.com',
	Access: 3
}

export async function init() {
	try {
		/* Create tables as needed */
		let [existingTables] = await db.query2('SHOW tables;')
			.catch(err => {
				console.log('show tables')
				throw err
			})

		existingTables = existingTables.map(t => Object.values(t)[0])
		//console.log(existingTables)
		for (let table of Object.keys(createTables)) {
			if (!existingTables.includes(table)) {
				console.log(`create ${table}`)
				await db.query(createTables[table])
			}
		}

		/* Make sure we have a super user with the right access level */
		const user = await users.getUser(superUser.SAPIN, superUser.Email)
		console.log(user)
		if (user === null) {						// User does not exist; create user
			await users.addUser(superUser)
		}
		else if (user.Access < superUser.Access) {	// User exists but has insufficient karma; upgrade karma
			user.Access = superUser.Access
			console.log('upgrade', user)
			await users.updateUser(user.SAPIN, user)
		}
	}
	catch(err) {
		throw err
	}
}
