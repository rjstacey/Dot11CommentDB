import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

export const deleteResults = (ballotId, ballot) =>
	async (dispatch) => {
		try {
			await fetcher.delete(`/api/results/${ballotId}`);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete results with ballotId=${ballotId}`, error));
		}
		await dispatch(updateBallotSuccess(ballot.id, {Results: {}}));
	}

export const importResults = (ballotId, epollNum) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(`/api/results/importFromEpoll/${ballotId}/${epollNum}`);
		}
		catch(error) {
			await dispatch(setError(`Unable to import results for ballotId=${ballotId}`, error));
			return
		}
		await dispatch(updateBallotSuccess(response.ballot.id, response.ballot));
	}

export const uploadEpollResults = (ballotId, file) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.postMultipart(`/api/results/uploadEpollResults/${ballotId}`, {ResultsFile: file})
		}
		catch(error) {
			await dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error));
		}
		await dispatch(updateBallotSuccess(response.ballot.id, response.ballot));
	}

export const uploadMyProjectResults = (ballotId, file) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.postMultipart(`/api/results/uploadMyProjectResults/${ballotId}`, {ResultsFile: file})
		}
		catch(error) {
			await dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error));
			return
		}
		await dispatch(updateBallotSuccess(response.ballot.id, response.ballot));
	}
	