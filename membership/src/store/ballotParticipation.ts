import { PayloadAction, Dictionary, createSelector, createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType,
	AppTableDataState,
	getAppTableDataSelectors,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';
import { Member, selectMemberEntities } from './members';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Status: {label: 'Status'},
	ExpectedStatus: {label: 'Expected status'},
	Excused: {label: 'Excused', sortType: SortType.NUMERIC},
	CommentCount: {label: 'Comments', sortType: SortType.NUMERIC},
    ballot_id: {label: 'Ballot ID', sortType: SortType.NUMERIC},
    Summary: {label: 'Summary'},
	ballotSeries_0: {label: 'Ballot series 1'},
	ballotSeries_1: {label: 'Ballot series 2'},
	ballotSeries_2: {label: 'Ballot series 3'}
};

export const dataSet = 'ballotParticipation';

type Ballot = {
    id: number;
    BallotID: string;
    Project: string;
}

type BallotSeries = {
    id: number;
    ballotIds: number[];
    votingPoolId: string;
    start: string;
    end: string;
    project: string;
}

export type BallotSeriesParticipationSummary = {
    id: number;                     /** Ballot series identifier */
	voter_id: string;				/** Voter identifier */
	votingPoolSAPIN: number;        /** SAPIN in voting pool */
    excused: boolean;               /** Excused from participation (recorded in voting pool table) */
	vote: string | null;            /** Last vote */
    SAPIN: number | null;           /** SAPIN used for last vote */
	ballot_id: number | null;       /** Ballot identifier for last vote */
	commentCount: number | null;    /** Number of comments submitted with vote */
}

export type RecentBallotSeriesParticipation = {
    SAPIN: number;
    ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[];
}

export type MemberParticipation = RecentBallotSeriesParticipation & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: string;
	ExpectedStatus: string;
    Summary: string;
}

const ballotSeriesAdapter = createEntityAdapter<BallotSeries>();
const ballotsAdapter = createEntityAdapter<Ballot>();

type ExtraState = {
	ballotSeries: EntityState<BallotSeries>;
    ballots: EntityState<Ballot>;
};

type BallotParticipationState = ExtraState & AppTableDataState<RecentBallotSeriesParticipation>;

const selectId = (entity: RecentBallotSeriesParticipation) => entity.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		ballotSeries: ballotSeriesAdapter.getInitialState(),
        ballots: ballotsAdapter.getInitialState()
	} as ExtraState,
	reducers: {
		setBallotSeries(state: ExtraState, action: PayloadAction<BallotSeries[]>) {
			ballotSeriesAdapter.setAll(state.ballotSeries, action.payload);
		},
        setBallots(state: ExtraState, action: PayloadAction<Ballot[]>) {
			ballotsAdapter.setAll(state.ballots, action.payload);
		},
	},
});

export default slice;


/*
 * Selectors
 */
export const selectBallotParticipationState = (state: RootState) => state[dataSet] as BallotParticipationState;

export const selectBallotParticipationEntities = (state: RootState) => selectBallotParticipationState(state).entities;
const selectBallotParticipationIds = (state: RootState) => selectBallotParticipationState(state).ids;

export const selectBallotSeries = (state: RootState) => selectBallotParticipationState(state).ballotSeries;
export const selectBallotSeriesEntities = (state: RootState) => selectBallotSeries(state).entities;

export const selectBallots = (state: RootState) => selectBallotParticipationState(state).ballots;

export function memberBallotParticipationCount(member: Member, ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[], ballotSeriesEntities: Dictionary<BallotSeries>) {
    // Only care about ballots since becoming a Voter
	// (a member may have lost voting status and we don't want participation from that time affecting the result)
	const h = member.StatusChangeHistory.find(h => h.NewStatus === 'Voter');
	if (h && h.Date)
		ballotSeriesParticipationSummaries = ballotSeriesParticipationSummaries.filter(s => DateTime.fromISO(ballotSeriesEntities[s.id]!.start) > DateTime.fromISO(h.Date));

	const count = ballotSeriesParticipationSummaries.reduce((count, participation) => (participation.vote || participation.excused)? count + 1: count, 0);
    return {
        count,
        total: ballotSeriesParticipationSummaries.length
    }
}

function memberExpectedStatusFromBallotParticipation(member: Member, count: number, total: number) {
    // A status change won't happen if a status override is in effect or if the member is not a voter
    if (member.StatusChangeOverride || member.Status !== 'Voter')
		return '';

	if (total >= 3 && count < 2)
		return 'Non-Voter';

	return '';
}

export const selectBallotParticipationWithMembershipAndSummary = createSelector(
	selectMemberEntities,
    selectBallotSeriesEntities,
	selectBallotParticipationIds,
	selectBallotParticipationEntities,
	(memberEntities, ballotSeriesEntities, ids, entities) => {
		const newEntities: Dictionary<MemberParticipation> = {};
		ids.forEach(id => {
			let entity = entities[id]!;
			let member = memberEntities[entity.SAPIN];
			let expectedStatus = '';
            let summary = '';
            if (member) {
                const {count, total} = memberBallotParticipationCount(member, entity.ballotSeriesParticipationSummaries, ballotSeriesEntities);
				expectedStatus = memberExpectedStatusFromBallotParticipation(member, count, total);
                summary = `${count}/${total}`;
            }
			newEntities[id] = {
				...entity,
				Name: member? member.Name: '',
				Email: member? member.Email: '',
				Affiliation: member? member.Affiliation: '',
				Employer: member? member.Employer: '',
				Status: member? member.Status: 'New',
				ExpectedStatus: expectedStatus,
                Summary: summary
			}
		});
		return newEntities;
	}
);

export function selectMemberBallotParticipationCount(state: RootState, SAPIN: number) {
	const ballotParticipationEntities = selectBallotParticipationEntities(state);
	const ballotSeriesEntities = selectBallotParticipationState(state).ballotSeries.entities;
	const summaries = ballotParticipationEntities[SAPIN]?.ballotSeriesParticipationSummaries || [];
	const member = selectMemberEntities(state)[SAPIN];
	if (member)
		return memberBallotParticipationCount(member, summaries, ballotSeriesEntities);
	return {count: 0, total: 0}
}

function getField(entity: MemberParticipation, dataKey: string): any {
	const m = /ballotSeries_(\d+)/.exec(dataKey)
	if (m) {
		const i = Number(m[1]);
		const summary = entity.ballotSeriesParticipationSummaries[i];
		if (!summary)
			return 'Not in pool';
		if (!summary.vote)
			return 'Did not vote';
		return summary.vote;
	}
	return entity[dataKey as keyof MemberParticipation];
}

export const ballotParticipationSelectors = getAppTableDataSelectors(selectBallotParticipationState, {selectEntities: selectBallotParticipationWithMembershipAndSummary, getField});

/*
 * Actions
 */

const {
	getPending,
	getSuccess,
	getFailure,
	setBallotSeries,
    setBallots,
	setOne
} = slice.actions;

export const ballotParticipationActions = slice.actions;

function validResponse(response: any): response is {ballots: Ballot[], ballotSeries: BallotSeries[], ballotSeriesParticipation: RecentBallotSeriesParticipation[]} {
	return isObject(response) &&
		Array.isArray(response.ballots) &&
		Array.isArray(response.ballotSeries) &&
		Array.isArray(response.ballotSeriesParticipation);

}

export const loadBallotParticipation = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const loading = selectBallotParticipationState(state).loading;
		if (loading)
			return;
		const groupName = selectWorkingGroupName(state);
		const url = `/api/${groupName}/ballotParticipation`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response)) {
				throw new TypeError('Unexpected response to GET ' + url);
			}
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get ballot series participation`, error));
			return;
		}
        dispatch(setBallots(response.ballots));
		dispatch(setBallotSeries(response.ballotSeries));
		dispatch(getSuccess(response.ballotSeriesParticipation));
	}

export type BallotParticipationUpdate = {
	id: number;
	changes: Partial<BallotSeriesParticipationSummary>
};

export const updateBallotParticipation = (sapin: number, updates: BallotParticipationUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const entities = selectBallotParticipationEntities(getState());
		let entity = entities[sapin];
		if (!entity) {
			console.error(`Entry for ${sapin} does not exist`);
			return;
		}
		const voterUpdates: Record<number, {id: string, changes: {Excused: boolean}}[]> = {};
		let updatedSummaries = entity.ballotSeriesParticipationSummaries.map(summary => {
			const update = updates.find(u => u.id === summary.id);
			if (!update)
				return summary;
			const {changes} = update;
			if ('excused' in changes) {
				const update = {id: summary.voter_id, changes: {Excused: changes.excused!}};
				if (voterUpdates[summary.id])
					voterUpdates[summary.id].push(update);
				else
					voterUpdates[summary.id] = [update];
			}
			return {...summary, ...changes};
		});
		Object.entries(voterUpdates).forEach(([ballot_id, updates]) => {
			const url = `/api/voters/${ballot_id}`;
			fetcher.patch(url, updates)
				.catch((error: any) => dispatch(setError('Unable to update voters', error)))
		})
		dispatch(setOne({SAPIN: sapin, ballotSeriesParticipationSummaries: updatedSummaries}));
	}
