import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

export const deleteResults = (ballot_id) =>
	async (dispatch) => {
		try {
			await fetcher.delete(`/api/results/${ballot_id}`);
		}
		catch(error) {
			await dispatch(setError("Unable to delete results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, {Results: {}}));
	}

export const importResults = (ballot_id, epollNum) =>
	async (dispatch) => {
		const url = `/api/results/${ballot_id}/importFromEpoll/${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw "Unexpected reponse to POST: " + url;
		}
		catch(error) {
			await dispatch(setError("Unable to import results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadEpollResults = (ballot_id, file) =>
	async (dispatch) => {
		const url = `/api/results/${ballot_id}/uploadEpollResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file})
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw "Unexpected reponse to POST: " + url;
		}
		catch(error) {
			await dispatch(setError("Unable to upload results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadMyProjectResults = (ballot_id, file) =>
	async (dispatch) => {
		const url = `/api/results/${ballot_id}/uploadMyProjectResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file});
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw "Unexpected reponse to POST: " + url;
		}
		catch(error) {
			await dispatch(setError("Unable to upload results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}
	