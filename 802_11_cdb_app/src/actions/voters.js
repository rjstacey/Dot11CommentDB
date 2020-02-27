import {setError} from './error'
var axios = require('axios');

export const SET_VOTING_POOL_FILTERS = 'SET_VOTING_POOL_FILTERS'
export const SET_VOTING_POOL_SORT = 'SET_VOTING_POOL_SORT'
export const GET_VOTING_POOL = 'GET_VOTING_POOL'
export const GET_VOTING_POOL_SUCCESS = 'GET_VOTING_POOL_SUCCESS'
export const GET_VOTING_POOL_FAILURE = 'GET_VOTING_POOL_FAILURE'
export const ADD_VOTING_POOL = 'ADD_VOTING_POOL'
export const ADD_VOTING_POOL_SUCCESS = 'ADD_VOTING_POOL_SUCCESS'
export const ADD_VOTING_POOL_FAILURE = 'ADD_VOTING_POOL_FAILURE'
export const DELETE_VOTING_POOL = 'DELETE_VOTING_POOL'
export const DELETE_VOTING_POOL_SUCCESS = 'DELETE_VOTING_POOL_SUCCESS'
export const DELETE_VOTING_POOL_FAILURE = 'DELETE_VOTING_POOL_FAILURE'


export const setVotingPoolFilters = (filters) => {return {type: SET_VOTING_POOL_FILTERS, filters}}
export const setVotingPoolSort = (sortBy, sortDirection) => {return {type: SET_VOTING_POOL_SORT, sortBy, sortDirection}}

const getVotingPoolLocal = () => {return {type: GET_VOTING_POOL}}
const getVotingPoolSuccess = (votingPoolData) => {return {type: GET_VOTING_POOL_SUCCESS, votingPoolData}}
const getVotingPoolFailure = () => {return {type: GET_VOTING_POOL_FAILURE}}

export function getVotingPool() {
	return async (dispatch) => {
		dispatch(getVotingPoolLocal())
		try {
			const response = await axios.get('/votingPool')
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getVotingPoolFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getVotingPoolSuccess(response.data.data))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getVotingPoolFailure()),
				dispatch(setError('Unable to get voting pool list', error.toString()))
			])
		}
	}
}

const addVotingPoolLocal = (votingPoolData) => {return {type: ADD_VOTING_POOL, votingPoolData}}
const addVotingPoolSuccess = (votingPoolData) => {return {type: ADD_VOTING_POOL_SUCCESS, votingPoolData}}
const addVotingPoolFailure = () => {return {type: ADD_VOTING_POOL_FAILURE}}

function generateVotingPoolId(votingPool) {
	var id = 0;
	votingPool.forEach(v => {
		if (v.VotingPoolID >= id) {id = v.VotingPoolID + 1}
	})
	return id
}

export function addVotingPool(newEntry) {
	return async (dispatch, getState) => {
		newEntry.VotingPoolID = generateVotingPoolId(getState().voters.votingPoolData);
		dispatch(addVotingPoolLocal(newEntry))
		try {
			const response = await axios.post('/votingPool', newEntry)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(addVotingPoolFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(addVotingPoolSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(addVotingPoolFailure()),
				dispatch(setError('Unable to add voting pool', error.toString()))
			])
		}
	}
}

const deleteVotingPoolLocal = (votingPoolId) => {return {type: DELETE_VOTING_POOL, votingPoolId}}
const deleteVotingPoolSuccess = (votingPoolId) => {return {type: DELETE_VOTING_POOL_SUCCESS, votingPoolId}}
const deleteVotingPoolFailure = () => {return {type: DELETE_VOTING_POOL_FAILURE}}

export function deleteVotingPool(votingPoolId) {
	return async (dispatch, getState) => {
		dispatch(deleteVotingPoolLocal(votingPoolId))
		try {
			const response = await axios.delete('/votingPool', {data: {VotingPoolID: votingPoolId}})
			if (response.data.status !== 'OK') {
				return Promise.alll([
					dispatch(deleteVotingPoolFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(deleteVotingPoolSuccess(votingPoolId))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotingPoolFailure()),
				dispatch(setError('Unable to delete voting pool', error.toString()))
			])
		}
	}
}

export const SET_VOTERS_FILTERS = 'SET_VOTERS_FILTERS'
export const SET_VOTERS_SORT = 'SET_VOTERS_SORT'
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

export const setVotersFilters = (filters) => {return {type: SET_VOTERS_FILTERS, filters}}
export const setVotersSort = (sortBy, sortDirection) => {return {type: SET_VOTERS_SORT, sortBy, sortDirection}}

const getVotersLocal = (votingPoolId) => {return {type: GET_VOTERS, votingPoolId}}
const getVotersSuccess = (data) => {return {type: GET_VOTERS_SUCCESS, votingPool: data.votingPool, voters: data.voters}}
const getVotersFailure = () => {return {type: GET_VOTERS_FAILURE}}

export function getVoters(votingPoolId) {
	return async (dispatch) => {
		dispatch(getVotersLocal(votingPoolId))
		try {
			const response = await axios.get('/voters', {params: {VotingPoolID: votingPoolId}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getVotersFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getVotersSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getVotersFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error.toString()))
			])
		}
	}
}


const deleteVotersLocal = (voterPoolId) => {return {type: DELETE_VOTERS, voterPoolId}}
const deleteVotersSuccess = (voterPoolId, SAPINs) => {return {type: DELETE_VOTERS_SUCCESS, voterPoolId, SAPINs}}
const deleteVotersFailure = () => {return {type: DELETE_VOTERS_FAILURE}}

export function deleteVoters(votingPoolId, SAPINs) {
	return async (dispatch) => {
		dispatch(deleteVotersLocal(votingPoolId));
		try {
			const response = await axios.delete('/voters', {data: {VotingPoolID: votingPoolId, SAPINs}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(deleteVotersFailure()),
					dispatch(setError(response.data.message))
				])
			}
				return dispatch(deleteVotersSuccess(votingPoolId, SAPINs))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotersFailure()),
				dispatch(setError(`Unable to delete voters for ballot series ${votingPoolId}`, error.toString()))
			])
		}
	}
}

const uploadVotersLocal = (votingPoolId) => {return {type: UPLOAD_VOTERS, votingPoolId}}
const uploadVotersSuccess = (votingPoolId) => {return {type: UPLOAD_VOTERS_SUCCESS, votingPoolId}}
const uploadVotersFailure = () => {return {type: UPLOAD_VOTERS_FAILURE}}

export function uploadVoters(votingPoolId, file) {
	return async (dispatch) => {
		dispatch(uploadVotersLocal(votingPoolId));
		try {
			var formData = new FormData();
			formData.append("VotingPoolID", votingPoolId);
			formData.append("VotersFile", file);
			const response = await axios.post('/voters/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(uploadVotersFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(uploadVotersSuccess(votingPoolId))
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadVotersFailure()),
				dispatch(setError(`Unable to import voters for voting pool ${votingPoolId}`, error.toString()))
			])
		}
	}
}

const addVoterLocal = (voter) => {return {type: ADD_VOTER, voter}}
const addVoterSuccess = (voter) => {return {type: ADD_VOTER_SUCCESS, voter}}
const addVoterFailure = () => {return {type: ADD_VOTER_FAILURE}}

export function addVoter(voter) {
	return async (dispatch) => {
		dispatch(addVoterLocal(voter));
		try {
			const response = await axios.post('/voters', voter)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(addVoterFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(addVoterSuccess(response.data.data))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(addVoterFailure()),
				dispatch(setError('Unable to add voter'))
			])
		}
	}
}

const updateVoterLocal = (votingPoolId, SAPIN, voterData) => {return {type: UPDATE_VOTER, votingPoolId, SAPIN, voterData}}
const updateVoterSuccess = (votingPoolId, SAPIN, voterData) => {return {type: UPDATE_VOTER_SUCCESS, votingPoolId, SAPIN, voterData}}
const updateVoterFailure = () => {return {type: UPDATE_VOTER_FAILURE}}

export function updateVoter(votingPoolId, SAPIN, voterData) {
	return async (dispatch) => {
		dispatch(updateVoterLocal(votingPoolId, SAPIN, voterData));
		try {
			const response = await axios.put(`/voters/${votingPoolId}/${SAPIN}`, voterData)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(updateVoterFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(updateVoterSuccess(votingPoolId, SAPIN, response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateVoterFailure()),
				dispatch(setError('Unable to update voter', error.toString()))
			])
		}
	}
}
