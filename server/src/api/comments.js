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

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {ballot_id} = req.params;
		const {modifiedSince} = req.query;
		const data = await getComments(ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const {updates, ballot_id, modifiedSince} = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad parameter "updates"; expected array';
		const data = await updateComments(user.SAPIN, updates, ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:ballot_id(\\d+)/startCommentId', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		const {StartCommentID} = req.body;
		const data = await setStartCommentId(user.SAPIN, ballot_id, StartCommentID);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		const data = await deleteComments(user.SAPIN, ballot_id);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.post('/:ballot_id(\\d+)/importFromEpoll/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id, epollNum} = req.params;
		const startCommentId = req.body.StartCID || 1;
		const data = await importEpollComments(user.ieeeCookieJar, user.SAPIN, ballot_id, epollNum, startCommentId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/upload/:type', upload.single('CommentsFile'), async (req, res, next) => {
	try {
		const {ballot_id} = req.params;
		const type = parseInt(req.params.type, 10);
		if (!req.file)
			throw 'Missing file';
		const startCommentId = req.body.StartCID || 1;
		const data = await uploadComments(req.user.SAPIN, ballot_id, type, startCommentId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/export/:format', upload.single('file'), (req, res, next) => {
	const {user} = req;
	const {ballot_id, format} = req.params;
	const {Filename, Style} = JSON.parse(req.body.params)
	const CommentsSpreadsheetFormat = {
		MyProject: 'MyProject',
		Legacy: 'Legacy',
		Modern: 'Modern'
	};
	if (!CommentsSpreadsheetFormat[format])
		return next(`Unexpected format: ${format}`)
	if (format === CommentsSpreadsheetFormat.MyProject) {
		if (!req.file)
			return next('Missing file')
		return exportResolutionsForMyProject(ballot_id, Filename, req.file, res).catch(err => next(err))
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
		return exportSpreadsheet(user, ballot_id, Filename, isLegacy, Style, req.file, res).catch(err => next(err))
	}
});

export default router;
