import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'

function displayDate(isoDate) {
	// ISO date: "YYYY-MM-DD"
	const year = parseInt(isoDate.substr(0, 4));
	const month = parseInt(isoDate.substr(5, 7));
	const date = parseInt(isoDate.substr(8, 10));
	const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${year} ${monthStr[month] || '???'} ${date}`; 
}

export const fields = {
	id: {label: 'ID', sortType: SortType.NUMERIC},
	breakoutDate: {label: 'Date', dataRenderer: displayDate},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	postAs: {label: 'Summary'},
	meeting: {label: 'Meeting'},
	comments: {label: 'Comments'},
	mtgRoom: {label: 'Room'},
	mtgHotel: {label: 'Hotel'},
	mtgLevel: {label: 'Level'},
	mtgLocation: {label: 'Location'},
	groupName: {label: 'Group'}
};

export const dataSet = 'ieee802WorldSchedule';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
});

export default slice;

/*
 * Selectors
 */
export const select802WorldScheduleState = (state) => state[dataSet];
 
 /*
  * Actions
  */
const {getPending, getSuccess, getFailure} = slice.actions;

const url = '/api/802world';

export const load802WorldSchedule = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			console.warn(error)
			await dispatch(getFailure());
			await dispatch(setError('Unable to get 802world schedule', error));
			return;
		}
		await dispatch(getSuccess(response));
	}

