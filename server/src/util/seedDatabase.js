'use strict'

import {getUser} from '../services/users'
import {addMember, updateMember} from '../services/members'
import {initCommentsTables} from '../services/comments'
import {initCommentsHistory} from '../services/commentsHistory'

const db = require('../util/database')

const usersTable =
	'CREATE TABLE `users` ( ' +
  		'`SAPIN` int unsigned NOT NULL, ' +
  		'`Access` int NOT NULL DEFAULT \'1\' COMMENT \'1 = View (participant, has IEEE login)\\n2 = Assign, Resolve (voting member)\\n3 = Reassign, Assign, Resolve (voting member, designated manager)\\n4 = Manage, Reassign, Assign, Resolve, Close (voting member, designated manager)\', ' +
  		'`Name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`LastName` varchar(128) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`FirstName` varchar(128) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`MI` varchar(45) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`Email` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Status` varchar(45) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'PRIMARY KEY (`SAPIN`) ' +
	') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;'

const ballotsTable = 
	'CREATE TABLE `ballots` ( ' +
  		'`id` int unsigned NOT NULL AUTO_INCREMENT, ' +
  		'`BallotID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, ' +
  		'`Project` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, ' +
  		'`Type` tinyint DEFAULT NULL, ' +
  		'`Document` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Topic` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Start` datetime DEFAULT NULL, ' +
  		'`End` datetime DEFAULT NULL, ' +
  		'`EpollNum` varchar(128) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`VotingPoolID` varchar(45) CHARACTER SET utf8 NOT NULL, ' +
  		'`PrevBallotID` varchar(16) CHARACTER SET utf8 NOT NULL, ' +
  		'`ResultsSummary` json DEFAULT NULL, ' +
  		'PRIMARY KEY (`id`), ' +
  		'UNIQUE KEY `unique_ballot_id` (`BallotID`) ' +
	') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';

const commentsTable =
	'CREATE TABLE `comments` (' +
  		'`id` bigint unsigned NOT NULL AUTO_INCREMENT, ' +
  		'`ballot_id` int unsigned NOT NULL, ' +
  		'`CommentID` int NOT NULL, ' +
  		'`CommenterSAPIN` int DEFAULT NULL, ' +
  		'`CommenterEmail` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`CommenterName` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`MustSatisfy` tinyint(1) DEFAULT \'0\', '+
  		'`Category` varchar(1) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`Clause` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Page` decimal(10,2) DEFAULT NULL, ' +
  		'`Comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, ' +
  		'`ProposedChange` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, ' +
  		'`C_Page` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`C_Line` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`C_Clause` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`C_Index` int DEFAULT NULL, ' +
  		'`AdHoc` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`CommentGroup` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, ' +
  		'`LastModifiedBy` int DEFAULT NULL, ' +
  		'`LastModifiedTime` datetime DEFAULT NULL, ' +
  		'PRIMARY KEY (`id`), ' +
  		'KEY `ballot_id` (`ballot_id`) ' +
	') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';

const resolutionsTable =
	'CREATE TABLE `resolutions` ( ' +
  		'`id` bigint unsigned NOT NULL AUTO_INCREMENT, ' +
  		'`comment_id` bigint unsigned NOT NULL, ' +
  		'`ResolutionID` int NOT NULL DEFAULT \'0\', ' +
  		'`AssigneeSAPIN` int DEFAULT NULL, ' +
  		'`AssigneeName` varchar(256) CHARACTER SET utf8 DEFAULT NULL, ' + 
  		'`ResnStatus` varchar(1) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`Resolution` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, ' +
  		'`Submission` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`EditStatus` varchar(1) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`EditNotes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, ' +
  		'`EditInDraft` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`ReadyForMotion` tinyint DEFAULT NULL, ' +
  		'`ApprovedByMotion` varchar(45) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'`LastModifiedBy` int DEFAULT NULL, ' +
  		'`LastModifiedTime` datetime DEFAULT NULL, ' +
  		'PRIMARY KEY (`id`), ' +
  		'KEY `comment_id` (`comment_id`) ' +
	') ENGINE=InnoDB AUTO_INCREMENT=146211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';

const resultsTable =
	'CREATE TABLE `results` ( ' +
  		'`id` bigint unsigned NOT NULL AUTO_INCREMENT, ' +
  		'`ballot_id` int unsigned NOT NULL, ' +
  		'`SAPIN` int NOT NULL, ' +
  		'`Email` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Affiliation` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL, ' +
  		'`Vote` varchar(64) CHARACTER SET utf8 DEFAULT NULL, ' +
  		'PRIMARY KEY (`id`), ' +
  		'KEY `ballot_id` (`ballot_id`) ' +
	') ENGINE=InnoDB AUTO_INCREMENT=23307 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';

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

		await initCommentsTables();
		await initCommentsHistory();

		/* Make sure we have a super user with the right access level */
		const user = await getUser(superUser.SAPIN, superUser.Email)
		console.log(user)
		if (user === null) {						// User does not exist; create user
			await addMember(superUser)
		}
		else if (user.Access < superUser.Access) {	// User exists but has insufficient karma; upgrade karma
			user.Access = superUser.Access
			console.log('upgrade', user)
			await updateMember(user.SAPIN, user)
		}
	}
	catch(err) {
		throw err
	}
}
