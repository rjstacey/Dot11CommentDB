import {createSelector} from 'reselect'

const getBallots = (state) => state.ballots.ballots
const getProject = (state) => state.ballots.project

/*
 * Generate project list from the ballot pool
 */
export const getProjectList = createSelector(
	getBallots,
	(ballots) => [...new Set(ballots.map(b => b.Project))].sort()
);

/*
 * Generate ballot list from the ballot pool
 */
export const getBallotList = createSelector(
	getBallots,
	getProject,
	(ballots, project) => {
		const compare = (a, b) => {
			const A = a.label.toUpperCase()
			const B = b.label.toUpperCase()
			return A < B? -1: (A > B? 1: 0)
		}
		return ballots.filter(b => b.Project === project)
			.map(b => ({value: b.BallotID, label: `${b.BallotID} ${b.Document}`}))
			.sort(compare)
	}
);
