import fetcher from 'dot11-common/store/fetcher'
import {setError} from 'dot11-common/store/error'

import {updateBallotSuccess} from './ballots'

export const deleteComments = (ballotId) =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete(`/api/comments/${ballotId}`)
		}
		catch(error) {
			await dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error));
			return;
		}
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		await updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary});
	}

export const importComments = (ballotId, epollNum, startCID) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(`/api/comments/importFromEpoll/${ballotId}/${epollNum}`, {StartCID: startCID});
		}
		catch(error) {
			await dispatch(setError(`Unable to import comments for ${ballotId}`, error));
			return;
		}
		const {ballot} = response;
		await dispatch(updateBallotSuccess(ballot.id, ballot))
	}

export const uploadComments = (ballotId, type, file) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.postMultipart(`/api/comments/upload/${ballotId}/${type}`, {CommentsFile: file});
		}
		catch(error) {
			await dispatch(setError(`Unable to upload comments for ${ballotId}`, error));
			return
		}
		const {ballot} = response;
		await dispatch(updateBallotSuccess(ballot.id, ballot));
	}

export const setStartCommentId = (ballotId, startCommentId) =>
	async (dispatch) => {
		let comments;
		try {
			comments = await fetcher.patch(`/api/comments/startCommentId/${ballotId}`, {StartCommentID: startCommentId});
		}
		catch(error) {
			await dispatch(setError(`Unable to start CID for ${ballotId}`, error));
			return
		}
	}
