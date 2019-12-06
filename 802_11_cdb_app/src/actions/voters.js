
var axios = require('axios');

export function setVotingPoolFilters(filters) {
	return {
		type: 'SET_VOTING_POOL_FILTERS',
		filters
	}

}

export function setVotingPoolSort(sortBy, sortDirection) {
	return {
		type: 'SET_VOTING_POOL_SORT',
		sortBy,
		sortDirection
	}
}

function getVotingPoolLocal() {
	return {
		type: 'GET_VOTING_POOL'
	}
}
function getVotingPoolSuccess(votingPoolData) {
	return {
		type: 'GET_VOTING_POOL_SUCCESS',
		votingPoolData
	}
}
function getVotingPoolFailure(msg) {
	return {
		type: 'GET_VOTING_POOL_FAILURE',
		errMsg: msg
	}
}

export function getVotingPool() {
	return dispatch => {
		dispatch(getVotingPoolLocal())
		return axios.get('/votingPool')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getVotingPoolFailure(response.data.message))
				}
				else {
					dispatch(getVotingPoolSuccess(response.data.data))
				}
			})
			.catch((error) => {
				console.log(error)
				dispatch(getVotingPoolFailure('Unable to get voting pool list'))
			})
	}
}

function addVotingPoolLocal(votingPoolData) {
	return {
		type: 'ADD_VOTING_POOL',
		votingPoolData
	}
}
function addVotingPoolSuccess(votingPoolData) {
	return {
		type: 'ADD_VOTING_POOL_SUCCESS',
		votingPoolData
	}
}
function addVotingPoolFailure(msg) {
	return {
		type: 'ADD_VOTING_POOL_FAILURE',
		errMsg: msg
	}
}

function generateVotingPoolId(votingPool) {
	var id = 0;
	votingPool.forEach(v => {
		if (v.VotingPoolID >= id) {id = v.VotingPoolID + 1}
	})
	return id
}

export function addVotingPool(newEntry) {
	return (dispatch, getState) => {
		newEntry.VotingPoolID = generateVotingPoolId(getState().voters.votingPoolData);
		dispatch(addVotingPoolLocal(newEntry))
		return axios.post('/votingPool', newEntry)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addVotingPoolFailure(response.data.message))
				}
				else {
					dispatch(addVotingPoolSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(addVotingPoolFailure('Unable to add voting pool'))
			})
	}
}

function deleteVotingPoolLocal(votingPoolId) {
	return {
		type: 'DELETE_VOTING_POOL',
		votingPoolId
	}
}
function deleteVotingPoolSuccess(votingPoolId) {
	return {
		type: 'DELETE_VOTING_POOL_SUCCESS',
		votingPoolId
	}
}
function deleteVotingPoolFailure(msg) {
	return {
		type: 'DELETE_VOTING_POOL_FAILURE',
		errMsg: msg
	}
}

export function deleteVotingPool(votingPoolId) {
	return (dispatch, getState) => {
		dispatch(deleteVotingPoolLocal(votingPoolId))
		return axios.delete('/votingPool', {data: {VotingPoolID: votingPoolId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteVotingPoolFailure(response.data.message))
				}
				else {
					dispatch(deleteVotingPoolSuccess(votingPoolId))
				}
			})
			.catch((error) => {
				dispatch(deleteVotingPoolFailure('Unable to delete voting pool'))
			})
	}
}


export function setVotersFilters(filters) {
	return {
		type: 'SET_VOTERS_FILTER',
		filters
	}

}

export function setVotersSort(sortBy, sortDirection) {
	return {
		type: 'SET_VOTERS_SORT',
		sortBy,
		sortDirection
	}
}

function getVotersLocal(votingPoolId) {
	return {
		type: 'GET_VOTERS',
		votingPoolId
	}
}
function getVotersSuccess(data) {
	return {
		type: 'GET_VOTERS_SUCCESS',
		votingPool: data.votingPool,
		voters: data.voters
	}
}
function getVotersFailure(msg) {
	return {
		type: 'GET_VOTERS_FAILURE',
		errMsg: msg
	}
}

export function getVoters(votingPoolId) {
	return dispatch => {
		dispatch(getVotersLocal(votingPoolId))
		return axios.get('/voters', {params: {VotingPoolID: votingPoolId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getVotersFailure(response.data.message))
				}
				else {
					dispatch(getVotersSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(getVotersFailure(`Unable to get voters for ${votingPoolId}`))
			})
	}
}


function deleteVotersLocal(voterPoolId) {
	return {
		type: 'DELETE_VOTERS',
		voterPoolId
	}
}
function deleteVotersSuccess(voterPoolId) {
	return {
		type: 'DELETE_VOTERS_SUCCESS',
		voterPoolId
	}
}
function deleteVotersFailure(msg) {
	return {
		type: 'DELETE_VOTERS_FAILURE',
		errMsg: msg
	}
}
export function deleteVoters(voterPoolId) {
	return dispatch => {
		dispatch(deleteVotersLocal(voterPoolId));
		return axios.delete('/voters', {data: {VoterPoolID: voterPoolId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteVotersFailure(response.data.message))
				}
				else {
					dispatch(deleteVotersSuccess(voterPoolId))
				}
			})
			.catch((error) => {
				dispatch(deleteVotersFailure(`Unable to delete voters for ballot series ${voterPoolId}`))
			})
	}
}

function uploadVotersLocal(votingPoolId) {
	return {
		type: 'UPLOAD_VOTERS',
		votingPoolId
	}
}
function uploadVotersSuccess(votingPoolId) {
	return {
		type: 'UPLOAD_VOTERS_SUCCESS',
		votingPoolId,
	}
}
function uploadVotersFailure(msg) {
	return {
		type: 'UPLOAD_VOTERS_FAILURE',
		errMsg: msg
	}
}
export function uploadVoters(votingPoolId, file) {
	return dispatch => {
		dispatch(uploadVotersLocal(votingPoolId));
		var formData = new FormData();
		formData.append("VotingPoolID", votingPoolId);
		formData.append("VotersFile", file);
		return axios.post('/voters/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(uploadVotersFailure(response.data.message))
				}
				else {
					dispatch(uploadVotersSuccess(votingPoolId))
				}
			})
			.catch((error) => {
				dispatch(uploadVotersFailure(`Unable to import voters for voting pool ${votingPoolId}`))
			})
	}
}

function addVoterLocal(voter) {
	return {
		type: 'ADD_VOTER',
		voter
	}
}
function addVoterSuccess(voter) {
	return {
		type: 'ADD_VOTER_SUCCESS',
		voter
	}
}
function addVoterFailure(msg) {
	return {
		type: 'ADD_VOTER_FAILURE',
		errMsg: msg
	}
}
export function addVoter(voter) {
	return dispatch => {
		dispatch(addVoterLocal(voter));
		return axios.post('/voters', voter)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addVoterFailure(response.data.message))
				}
				else {
					dispatch(addVoterSuccess(response.data.data))
				}
			})
			.catch((error) => {
				console.log(error)
				dispatch(addVoterFailure('Unable to add voter'))
			})
	}
}

export function clearVotersError() {
	return {
		type: 'CLEAR_VOTERS_ERROR',
	}
}
