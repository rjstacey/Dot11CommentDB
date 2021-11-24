import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

export const deleteComments = (ballot_id) =>
	async (dispatch) => {
		try {
			await fetcher.delete(`/api/comments/${ballot_id}`)
		}
		catch(error) {
			await dispatch(setError(`Unable to delete comments`, error));
			return;
		}
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		await dispatch(updateBallotSuccess(ballot_id, {Comments: summary}));
	}

export const importComments = (ballot_id, epollNum, startCID) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/importFromEpoll//${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url, {StartCID: startCID});
			if (typeof response !== 'object' ||
				typeof response.ballot !== 'object') {
				throw 'Unexpected response to POST: ' + url;
			}
		}
		catch(error) {
			await dispatch(setError(`Unable to import comments`, error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot))
	}

export const uploadComments = (ballot_id, type, file) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/upload/${type}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {CommentsFile: file});
			if (typeof response !== 'object' ||
				typeof response.ballot !== 'object') {
				throw 'Unexpected response to POST: ' + url;
			}
		}
		catch(error) {
			await dispatch(setError(`Unable to upload comments`, error));
			return
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const setStartCommentId = (ballot_id, startCommentId) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/startCommentId`;
		let response;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (typeof response !== 'object' ||
				typeof response.ballot !== 'object') {
				throw 'Unexpected response to PATCH: ' + url;
			}
		}
		catch(error) {
			await dispatch(setError(`Unable to set start CID`, error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}
