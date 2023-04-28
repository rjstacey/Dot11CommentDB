import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType
} from 'dot11-components';

import type { AppThunk, RootState } from '.';

type Committee = {
	id: number;
	parent_id: number;
	type: any;
	symbol: string;
	shortName: string;
	name: string;
}

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	parent_id: {label: 'parent_id', sortType: SortType.NUMERIC},
	type: {label: 'Type'},
	symbol: {label: 'Symbol'},
	shortName: {label: 'Short name'},
	name: {label: 'Name', sortType: SortType.DATE},
};

export const dataSet = 'imatCommittees';

const selectId = (d: Committee) => d.symbol;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {group: null},
	reducers: {
		setDetails(state, action) {
			state.group = action.payload.group;
		},
	},
});

export default slice;

/*
 * Selector
 */
export const selectImatCommitteesState = (state: RootState) => state[dataSet];

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
} = slice.actions;

const baseUrl = '/api/imat/committees';

export const loadCommittees = (group: any): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${group}`;
		let committees;
		try {
			committees = await fetcher.get(url);
			if (!Array.isArray(committees))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get committees for ${group}`, error));
			return;
		}
		dispatch(getSuccess(committees));
		dispatch(setDetails({group}));
	}

