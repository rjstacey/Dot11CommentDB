import {setError} from './error'
import fetcher from '../lib/fetcher'
import {setSelected} from './select'

const dataSet = 'voters'

export const VOTERS_PREFIX = 'VOTERS_'

export const VOTERS_GET = VOTERS_PREFIX + 'GET'
export const VOTERS_GET_SUCCESS = VOTERS_PREFIX + 'GET_SUCCESS'
export const VOTERS_GET_FAILURE = VOTERS_PREFIX + 'GET_FAILURE'

export const VOTERS_DELETE = VOTERS_PREFIX + 'DELETE'
export const VOTERS_DELETE_SUCCESS = VOTERS_PREFIX + 'DELETE_SUCCESS'
export const VOTERS_DELETE_FAILURE = VOTERS_PREFIX + 'DELETE_FAILURE'

export const VOTERS_UPLOAD = VOTERS_PREFIX + 'UPLOAD'
export const VOTERS_UPLOAD_SUCCESS = VOTERS_PREFIX + 'UPLOAD_SUCCESS'
export const VOTERS_UPLOAD_FAILURE = VOTERS_PREFIX + 'UPLOAD_FAILURE'

export const VOTERS_ADD = VOTERS_PREFIX + 'ADD'
export const VOTERS_ADD_SUCCESS = VOTERS_PREFIX + 'ADD_SUCCESS'
export const VOTERS_ADD_FAILURE = VOTERS_PREFIX + 'ADD_FAILURE'

export const VOTERS_UPDATE = VOTERS_PREFIX + 'UPDATE'
export const VOTERS_UPDATE_SUCCESS = VOTERS_PREFIX + 'UPDATE_SUCCESS'
export const VOTERS_UPDATE_FAILURE = VOTERS_PREFIX + 'UPDATE_FAILURE'

function updateIdList(votingPoolType, voters, selected) {
	const idKey = votingPoolType = 'WG'? 'SAPIN': 'Email'
	const changed = selected.reduce(
		(result, id) => result || !voters.find(v => v[idKey] === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !voters.find(v => v[idKey] === id))
}

const getVotersLocal = (votingPoolType, votingPoolId) => ({type: VOTERS_GET, votingPoolType, votingPoolId})
const getVotersSuccess = (votingPool, voters) => ({type: VOTERS_GET_SUCCESS, votingPool, voters})
const getVotersFailure = () => ({type: VOTERS_GET_FAILURE})

export function getVoters(votingPoolType, votingPoolId) {
	return async (dispatch, getState) => {
		dispatch(getVotersLocal(votingPoolType, votingPoolId))
		try {
			const {votingPool, voters} = await fetcher.get(`/api/voters/${votingPoolType}/${votingPoolId}`)

			const p = []
			const {selected} = getState()[dataSet]
			const newSelected = updateIdList(votingPoolType, voters, selected)
			if (newSelected !== selected)
				p.push(dispatch(setSelected(dataSet, newSelected)))
			p.push(dispatch(getVotersSuccess(votingPool, voters)))
			return Promise.all(p)
		}
		catch(error) {
			return Promise.all([
				dispatch(getVotersFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			])
		}
	}
}

const deleteVotersLocal = (votingPoolType, votingPoolId) => ({type: VOTERS_DELETE, votingPoolType, votingPoolId})
const deleteVotersSuccess = (votingPool, voterIds) => ({type: VOTERS_DELETE_SUCCESS, votingPool, voterIds})
const deleteVotersFailure = () => ({type: VOTERS_DELETE_FAILURE})

export function deleteVoters(votingPoolType, votingPoolId, voterIds) {
	return async (dispatch, getState) => {
		dispatch(deleteVotersLocal(votingPoolType, votingPoolId))
		try {
			const idArrayName = votingPoolType === 'SA'? 'Emails': 'SAPINs'
			const {votingPool} = await fetcher.delete(`/api/voters/${votingPoolType}/${votingPoolId}`, {[idArrayName]: voterIds})
			const {selected} = getState()[dataSet]
			const newSelected = selected.filter(id => !voterIds.includes(id))
			return Promise.all([
					dispatch(setSelected(dataSet, newSelected)),
					dispatch(deleteVotersSuccess(votingPool, voterIds))
				])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotersFailure()),
				dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error))
			])
		}
	}
}

const uploadVotersLocal = (votingPoolType, votingPoolId) => ({type: VOTERS_UPLOAD, votingPoolType, votingPoolId})
const uploadVotersSuccess = (votingPool, voters) => ({type: VOTERS_UPLOAD_SUCCESS, votingPool, voters})
const uploadVotersFailure = () => ({type: VOTERS_UPLOAD_FAILURE})

export function uploadVoters(votingPoolType, votingPoolId, file) {
	return async (dispatch) => {
		dispatch(uploadVotersLocal(votingPoolType, votingPoolId))
		dispatch(setSelected(dataSet, []))
		try {
			var formData = new FormData()
			formData.append("VotersFile", file)
			const {voters, votingPool} = await fetcher.postMultipart(`/api/votersUpload/${votingPoolType}/${votingPoolId}`, {VotersFile: file})
			return dispatch(uploadVotersSuccess(votingPool, voters))
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadVotersFailure()),
				dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error))
			])
		}
	}
}

const addVoterLocal = (votingPoolType, votingPoolId, voter) => ({type: VOTERS_ADD, votingPoolType, votingPoolId, voter})
const addVoterSuccess = (votingPool, voter) => ({type: VOTERS_ADD_SUCCESS, voter, votingPool})
const addVoterFailure = () => ({type: VOTERS_ADD_FAILURE})

export function addVoter(votingPoolType, votingPoolId, voter) {
	return async (dispatch) => {
		dispatch(addVoterLocal(votingPoolType, votingPoolId, voter))
		try {
			const data = await fetcher.post(`/api/voter/${votingPoolType}/${votingPoolId}`, voter)
			return dispatch(addVoterSuccess(data.votingPool, data.voter))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(addVoterFailure()),
				dispatch(setError('Unable to add voter', error))
			])
		}
	}
}

const updateVoterLocal = (votingPoolType, votingPoolId, voterId, voter) => ({type: VOTERS_UPDATE, votingPoolType, votingPoolId, voterId, voter})
const updateVoterSuccess = (votingPool, voterId, voter) => ({type: VOTERS_UPDATE_SUCCESS, votingPool, voterId, voter})
const updateVoterFailure = () => ({type: VOTERS_UPDATE_FAILURE})

export function updateVoter(votingPoolType, votingPoolId, voterId, voter) {
	return async (dispatch) => {
		dispatch(updateVoterLocal(votingPoolType, votingPoolId, voterId, voter))
		try {
			const data = await fetcher.put(`/api/voter/${votingPoolType}/${votingPoolId}/${voterId}`, voter)
			return dispatch(updateVoterSuccess(data.votingPool, voterId, data.voter))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateVoterFailure()),
				dispatch(setError('Unable to update voter', error))
			])
		}
	}
}
