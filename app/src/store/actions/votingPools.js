import {setError} from './error'
import fetcher from '../lib/fetcher'
import {setSelected} from './select'

const dataSet = 'votingPools'

export const VOTING_POOLS_PREFIX = 'VOTING_POOLS_'

export const VOTING_POOLS_GET = VOTING_POOLS_PREFIX + 'GET'
export const VOTING_POOLS_GET_SUCCESS = VOTING_POOLS_PREFIX + 'GET_SUCCESS'
export const VOTING_POOLS_GET_FAILURE = VOTING_POOLS_PREFIX + 'GET_FAILURE'

export const VOTING_POOLS_DELETE = VOTING_POOLS_PREFIX + 'DELETE'
export const VOTING_POOLS_DELETE_SUCCESS = VOTING_POOLS_PREFIX + 'DELETE_SUCCESS'
export const VOTING_POOLS_DELETE_FAILURE = VOTING_POOLS_PREFIX + 'DELETE_FAILURE'

function updateIdList(votingPools, selected) {
	const changed = selected.reduce(
		(result, id) => result || !votingPools.find(vp => vp.VotingPoolID === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !votingPools.find(vp => vp.VotingPoolID === id))
}


const getVotingPoolsLocal = () => ({type: VOTING_POOLS_GET})
const getVotingPoolsSuccess = (votingPools) => ({type: VOTING_POOLS_GET_SUCCESS, votingPools})
const getVotingPoolsFailure = () => ({type: VOTING_POOLS_GET_FAILURE})

export function getVotingPools() {
	return async (dispatch, getState) => {
		if (getState().voters.getVotingPools)
			return null
		dispatch(getVotingPoolsLocal())
		try {
			const {votingPools} = await fetcher.get('/api/votingPools')

			const p = []
			const {selected} = getState()[dataSet]
			const newSelected = updateIdList(votingPools, selected)
			if (newSelected !== selected)
				p.push(dispatch(setSelected(dataSet, newSelected)))

			p.push(dispatch(getVotingPoolsSuccess(votingPools)))
			return Promise.all(p)
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

const deleteVotingPoolsLocal = (votingPools) => ({type: VOTING_POOLS_DELETE, votingPools})
const deleteVotingPoolsSuccess = (votingPools) => ({type: VOTING_POOLS_DELETE_SUCCESS, votingPools})
const deleteVotingPoolsFailure = () => ({type: VOTING_POOLS_DELETE_FAILURE})

export function deleteVotingPools(votingPools) {
	return async (dispatch, getState) => {
		dispatch(deleteVotingPoolsLocal(votingPools))
		try {
			await fetcher.delete('/api/votingPools', votingPools)
			const {selected} = getState()[dataSet]
			const newSelected = selected.filter(id => !votingPools.find(vp => vp.VotingPoolID === id))
			return Promise.all([
				dispatch(deleteVotingPoolsSuccess(votingPools)),
				dispatch(setSelected(dataSet, newSelected))
				])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteVotingPoolsFailure()),
				dispatch(setError('Unable to delete voting pool(s)', error))
			])
		}
	}
}
