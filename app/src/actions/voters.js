import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_VOTING_POOLS_FILTER = 'SET_VOTING_POOLS_FILTER'
export const SET_VOTING_POOLS_SORT = 'SET_VOTING_POOLS_SORT'
export const SET_VOTING_POOLS_SELECTED = 'SET_VOTING_POOLS_SELECTED'
export const GET_VOTING_POOLS = 'GET_VOTING_POOLS'
export const GET_VOTING_POOLS_SUCCESS = 'GET_VOTING_POOLS_SUCCESS'
export const GET_VOTING_POOLS_FAILURE = 'GET_VOTING_POOLS_FAILURE'
export const DELETE_VOTING_POOLS = 'DELETE_VOTING_POOL'
export const DELETE_VOTING_POOLS_SUCCESS = 'DELETE_VOTING_POOLS_SUCCESS'
export const DELETE_VOTING_POOLS_FAILURE = 'DELETE_VOTING_POOLS_FAILURE'


export const setVotingPoolsFilter = (dataKey, value) => {return {type: SET_VOTING_POOLS_FILTER, dataKey, value}}
export const setVotingPoolsSort = (event, dataKey) => {return {type: SET_VOTING_POOLS_SORT, event, dataKey}}
export const setVotingPoolsSelected = (selected) => {return {type: SET_VOTING_POOLS_SELECTED, selected}}

const getVotingPoolsLocal = () => {return {type: GET_VOTING_POOLS}}
const getVotingPoolsSuccess = (votingPools) => {return {type: GET_VOTING_POOLS_SUCCESS, votingPools}}
const getVotingPoolsFailure = () => {return {type: GET_VOTING_POOLS_FAILURE}}

export function getVotingPools() {
	return async (dispatch) => {
		dispatch(getVotingPoolsLocal())
		try {
			const {votingPools} = await fetcher.get('/api/votingPools')
			return dispatch(getVotingPoolsSuccess(votingPools))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getVotingPoolsFailure()),
				dispatch(setError('Unable to get voting pool list', error))
			])
		}
	}
}

const deleteVotingPoolsLocal = (votingPools) => {return {type: DELETE_VOTING_POOLS, votingPools}}
const deleteVotingPoolsSuccess = (votingPools) => {return {type: DELETE_VOTING_POOLS_SUCCESS, votingPools}}
const deleteVotingPoolsFailure = () => {return {type: DELETE_VOTING_POOLS_FAILURE}}

export function deleteVotingPools(votingPools) {
	return async (dispatch, getState) => {
		dispatch(deleteVotingPoolsLocal(votingPools))
		try {
			await fetcher.delete('/api/votingPools', votingPools)
			return dispatch(deleteVotingPoolsSuccess(votingPools))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotingPoolsFailure()),
				dispatch(setError('Unable to delete voting pool(s)', error))
			])
		}
	}
}

export const SET_VOTERS_FILTER = 'SET_VOTERS_FILTER'
export const SET_VOTERS_SORT = 'SET_VOTERS_SORT'
export const SET_VOTERS_SELECTED = 'SET_VOTERS_SELECTED'
export const GET_VOTERS = 'GET_VOTERS'
export const GET_VOTERS_SUCCESS = 'GET_VOTERS_SUCCESS'
export const GET_VOTERS_FAILURE = 'GET_VOTERS_FAILURE'
export const DELETE_VOTERS = 'DELETE_VOTERS'
export const DELETE_VOTERS_SUCCESS = 'DELETE_VOTERS_SUCCESS'
export const DELETE_VOTERS_FAILURE = 'DELETE_VOTERS_FAILURE'
export const UPLOAD_VOTERS = 'UPLOAD_VOTERS'
export const UPLOAD_VOTERS_SUCCESS = 'UPLOAD_VOTERS_SUCCESS'
export const UPLOAD_VOTERS_FAILURE = 'UPLOAD_VOTERS_FAILURE'
export const ADD_VOTER = 'ADD_VOTER'
export const ADD_VOTER_SUCCESS = 'ADD_VOTER_SUCCESS'
export const ADD_VOTER_FAILURE = 'ADD_VOTER_FAILURE'
export const UPDATE_VOTER = 'UPDATE_VOTER'
export const UPDATE_VOTER_SUCCESS = 'UPDATE_VOTER_SUCCESS'
export const UPDATE_VOTER_FAILURE = 'UPDATE_VOTER_FAILURE'

export const setVotersFilter = (dataKey, value) => {return {type: SET_VOTERS_FILTER, dataKey, value}}
export const setVotersSort = (event, dataKey) => {return {type: SET_VOTERS_SORT, event, dataKey}}
export const setVotersSelected = (selected) => {return {type: SET_VOTERS_SELECTED, selected}}

const getVotersLocal = (votingPoolType, votingPoolId) => {return {type: GET_VOTERS, votingPoolType, votingPoolId}}
const getVotersSuccess = (votingPool, voters) => {return {type: GET_VOTERS_SUCCESS, votingPool, voters}}
const getVotersFailure = () => {return {type: GET_VOTERS_FAILURE}}

export function getVoters(votingPoolType, votingPoolId) {
	return async (dispatch) => {
		dispatch(getVotersLocal(votingPoolType, votingPoolId))
		try {
			const {votingPool, voters} = await fetcher.get(`/api/voters/${votingPoolType}/${votingPoolId}`)
			return dispatch(getVotersSuccess(votingPool, voters))
		}
		catch(error) {
			return Promise.all([
				dispatch(getVotersFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			])
		}
	}
}

const deleteVotersLocal = (votingPoolType, votingPoolId) => {return {type: DELETE_VOTERS, votingPoolType, votingPoolId}}
const deleteVotersSuccess = (votingPool, voterIds) => {return {type: DELETE_VOTERS_SUCCESS, votingPool, voterIds}}
const deleteVotersFailure = () => {return {type: DELETE_VOTERS_FAILURE}}

export function deleteVoters(votingPoolType, votingPoolId, voterIds) {
	return async (dispatch) => {
		dispatch(deleteVotersLocal(votingPoolType, votingPoolId))
		try {
			const idArrayName = votingPoolType === 'SA'? 'Emails': 'SAPINs'
			const {votingPool} = await fetcher.delete(`/api/voters/${votingPoolType}/${votingPoolId}`, {[idArrayName]: voterIds})
			return dispatch(deleteVotersSuccess(votingPool, voterIds))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotersFailure()),
				dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error))
			])
		}
	}
}

const uploadVotersLocal = (votingPoolType, votingPoolId) => {return {type: UPLOAD_VOTERS, votingPoolType, votingPoolId}}
const uploadVotersSuccess = (votingPool, voters) => {return {type: UPLOAD_VOTERS_SUCCESS, votingPool, voters}}
const uploadVotersFailure = () => {return {type: UPLOAD_VOTERS_FAILURE}}

export function uploadVoters(votingPoolType, votingPoolId, file) {
	return async (dispatch) => {
		dispatch(uploadVotersLocal(votingPoolType, votingPoolId))
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

const addVoterLocal = (votingPoolType, votingPoolId, voter) => {return {type: ADD_VOTER, votingPoolType, votingPoolId, voter}}
const addVoterSuccess = (votingPool, voter) => {return {type: ADD_VOTER_SUCCESS, voter, votingPool}}
const addVoterFailure = () => {return {type: ADD_VOTER_FAILURE}}

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

const updateVoterLocal = (votingPoolType, votingPoolId, voterId, voter) => {return {type: UPDATE_VOTER, votingPoolType, votingPoolId, voterId, voter}}
const updateVoterSuccess = (votingPool, voterId, voter) => {return {type: UPDATE_VOTER_SUCCESS, votingPool, voterId, voter}}
const updateVoterFailure = () => {return {type: UPDATE_VOTER_FAILURE}}

export function updateVoter(votingPoolType, votingPoolId, voterId, voter) {
	return async (dispatch) => {
		dispatch(updateVoterLocal(votingPoolType, votingPoolId, voter))
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
