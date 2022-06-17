import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	parent_id: {label: 'parent_id', sortType: SortType.NUMERIC},
	type: {label: 'Type'},
	symbol: {label: 'Symbol'},
	shortName: {label: 'Short name'},
	name: {label: 'Name', sortType: SortType.DATE},
};

export const dataSet = 'imatCommittees';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
});

/*
 * Selector
 */
export const selectImatCommitteesState = state => state[dataSet];

/*
 * Reducer
 */
export default slice.reducer;


/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
} = slice.actions;

export const loadCommittees = (group) =>
	async (dispatch, getState) => {
		const state = getState();
		dispatch(getPending());
		const url = `/api/imat/committees/${group}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response)) {
				throw new TypeError(`Unexpected response to GET ${url}`);
			}
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get committees for ${group}`, error));
			return;
		}
		dispatch(getSuccess(response));
	}

