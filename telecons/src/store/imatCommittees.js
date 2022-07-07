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
const selectId = (d) => d.symbol;

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
	setDetails,
} = slice.actions;

const baseUrl = '/api/imat/committees';

export const loadCommittees = (group) =>
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

