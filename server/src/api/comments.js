/*
 * Comments API
 *
 * GET /comments/{ballotId} - return an array with all comments for a given ballot
 * PUT /comments - update a comments; returns the updated comments
 * DELETE /comments/{ballotId} - delete all comments for a given ballot
 * POST /comments/importFromEpoll/{ballotId}/{epollNum} - replace existing comments (if any) with comments imported from an epoll on mentor
 * POST /comments/upload/{ballotId}/{type} - import comments from a file; file format determined by type
 * GET /exportComments/myProject - export resolved comments in a form suitable for MyProject upload
 */
import {
	getComments,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
} from '../services/comments';

import {
	exportResolutionsForMyProject,
	exportSpreadsheet
} from '../services/resolutions';

const upload = require('multer')();
const router = require('express').Router();

router.get('/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const data = await getComments(ballotId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('ids'))
			throw 'Missing ids parameter'
		if (!req.body.hasOwnProperty('changes'))
			throw 'Missing changes parameter'
		const {ids, changes} = req.body
		if (!Array.isArray(ids))
			throw 'Expect an array for ids parameter'
		if (typeof changes !== 'object')
			throw 'Expect an object for changes parameter'
		const data = await updateComments(req.user.SAPIN, ids, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/startCommentId/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const {StartCommentID} = req.body;
		const data = await setStartCommentId(req.user.SAPIN, ballotId, StartCommentID);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const data = await deleteComments(req.user.SAPIN, ballotId);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.post('/importFromEpoll/:ballotId/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId, epollNum} = req.params;
		const startCommentId = req.body.StartCID || 1;
		const data = await importEpollComments(user.ieeeCookieJar, user.SAPIN, ballotId, epollNum, startCommentId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/upload/:ballotId/:type', upload.single('CommentsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const type = parseInt(req.params.type, 10);
		if (!req.file)
			throw 'Missing file';
		const startCommentId = req.body.StartCID || 1;
		const data = await uploadComments(req.user.SAPIN, ballotId, type, startCommentId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/export/:format', upload.single('file'), (req, res, next) => {
	const {user} = req;
	const {format} = req.params;
	const {BallotID, Filename, Style} = JSON.parse(req.body.params)
	const CommentsSpreadsheetFormat = {
		MyProject: 'MyProject',
		Legacy: 'Legacy',
		Modern: 'Modern'
	};
	if (!CommentsSpreadsheetFormat[format])
		return next(`Unexpected format: ${format}`)
	if (!BallotID)
		return next('Missing parameter BallotID')
	if (format === CommentsSpreadsheetFormat.MyProject) {
		if (!req.file)
			return next('Missing file')
		return exportResolutionsForMyProject(BallotID, Filename, req.file, res).catch(err => next(err))
	}
	else {
		let isLegacy;
		if (format === CommentsSpreadsheetFormat.Legacy)
			isLegacy = true;
		else if (format === CommentsSpreadsheetFormat.Modern)
			isLegacy = false;
		else
			return next(`Invalid parameter format ${format}`)
		if (!Style)
			return next('Missing parameter Style')
		return exportSpreadsheet(user, BallotID, Filename, isLegacy, Style, req.file, res).catch(err => next(err))
	}
});

export default router;
