
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
	return async (dispatch) => {
		dispatch(getVotingPoolLocal())
		try {
			const response = await axios.get('/votingPool')
			if (response.data.status === 'OK') {
				return dispatch(getVotingPoolSuccess(response.data.data))
			}
			else {
				return dispatch(getVotingPoolFailure(response.data.message))
			}
		}
		catch(error) {
				console.log(error)
				return dispatch(getVotingPoolFailure('Unable to get voting pool list'))
		}
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
	return async (dispatch, getState) => {
		newEntry.VotingPoolID = generateVotingPoolId(getState().voters.votingPoolData);
		dispatch(addVotingPoolLocal(newEntry))
		try {
			const response = await axios.post('/votingPool', newEntry)
			if (response.data.status === 'OK') {
				return dispatch(addVotingPoolSuccess(response.data.data))
			}
			else {
				return dispatch(addVotingPoolFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(addVotingPoolFailure('Unable to add voting pool'))
		}
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
	return async (dispatch, getState) => {
		dispatch(deleteVotingPoolLocal(votingPoolId))
		try {
			const response = await axios.delete('/votingPool', {data: {VotingPoolID: votingPoolId}})
			if (response.data.status === 'OK') {
				return dispatch(deleteVotingPoolSuccess(votingPoolId))
			}
			else {
				return dispatch(deleteVotingPoolFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(deleteVotingPoolFailure('Unable to delete voting pool'))
		}
	}
}


export function setVotersFilters(filters) {
	return {
		type: 'SET_VOTERS_FILTERS',
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
	return async (dispatch) => {
		dispatch(getVotersLocal(votingPoolId))
		try {
			const response = await axios.get('/voters', {params: {VotingPoolID: votingPoolId}})
			if (response.data.status === 'OK') {
				return dispatch(getVotersSuccess(response.data.data))
			}
			else {
				return dispatch(getVotersFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(getVotersFailure(`Unable to get voters for ${votingPoolId}`))
		}
	}
}


function deleteVotersLocal(voterPoolId) {
	return {
		type: 'DELETE_VOTERS',
		voterPoolId
	}
}
function deleteVotersSuccess(voterPoolId, SAPINs) {
	return {
		type: 'DELETE_VOTERS_SUCCESS',
		voterPoolId,
		SAPINs
	}
}
function deleteVotersFailure(msg) {
	return {
		type: 'DELETE_VOTERS_FAILURE',
		errMsg: msg
	}
}
export function deleteVoters(votingPoolId, SAPINs) {
	return async (dispatch) => {
		dispatch(deleteVotersLocal(votingPoolId));
		try {
			const response = await axios.delete('/voters', {data: {VotingPoolID: votingPoolId, SAPINs}})
			if (response.data.status === 'OK') {
				return dispatch(deleteVotersSuccess(votingPoolId, SAPINs))
			}
			else {
				return dispatch(deleteVotersFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(deleteVotersFailure(`Unable to delete voters for ballot series ${votingPoolId}`))
		}
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
	return async (dispatch) => {
		dispatch(uploadVotersLocal(votingPoolId));
		try {
			var formData = new FormData();
			formData.append("VotingPoolID", votingPoolId);
			formData.append("VotersFile", file);
			const response = await axios.post('/voters/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status === 'OK') {
				return dispatch(uploadVotersSuccess(votingPoolId))
			}
			else {
				return dispatch(uploadVotersFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(uploadVotersFailure(`Unable to import voters for voting pool ${votingPoolId}`))
		}
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
	return async (dispatch) => {
		dispatch(addVoterLocal(voter));
		try {
			const response = await axios.post('/voters', voter)
			if (response.data.status === 'OK') {
				return dispatch(addVoterSuccess(response.data.data))
			}
			else {
				return dispatch(addVoterFailure(response.data.message))
			}
		}
		catch(error) {
			console.log(error)
			return dispatch(addVoterFailure('Unable to add voter'))
		}
	}
}

function updateVoterLocal(votingPoolId, SAPIN, voterData) {
	return {
		type: 'UPDATE_VOTER',
		votingPoolId,
		SAPIN,
		voterData
	}
}
function updateVoterSuccess(votingPoolId, SAPIN, voterData) {
	return {
		type: 'UPDATE_VOTER_SUCCESS',
		votingPoolId,
		SAPIN,
		voterData
	}
}
function updateVoterFailure(msg) {
	return {
		type: 'UPDATE_VOTER_FAILURE',
		errMsg: msg
	}
}
export function updateVoter(votingPoolId, SAPIN, voterData) {
	return async (dispatch) => {
		dispatch(updateVoterLocal(votingPoolId, SAPIN, voterData));
		try {
			const response = await axios.put(`/voters/${votingPoolId}/${SAPIN}`, voterData)
			if (response.data.status === 'OK') {
				return dispatch(updateVoterSuccess(votingPoolId, SAPIN, response.data.data))
			}
			else {
				return dispatch(updateVoterFailure(response.data.message))
			}
		}
		catch(error) {
			console.log(error)
			return dispatch(updateVoterFailure('Unable to update voter'))
		}
	}
}

export function clearVotersError() {
	return {
		type: 'CLEAR_VOTERS_ERROR',
	}
}
