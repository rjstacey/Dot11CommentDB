import React from 'react'
import {useDispatch, useSelector} from 'react-redux'
import {loadCalendarAccounts, dataSet} from '../store/calendarAccounts';

function ShowCalendar({group}) {
	const dispatch = useDispatch();
	const {entities, valid, loading} = useSelector(state => state[dataSet]);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadCalendarAccounts(group));
	}, [valid, loading, dispatch, group]);

	const calendarLink = React.useMemo(() => {
		for (const account of Object.values(entities)) {
			if (account.groups.includes(group) && account.details) {
				const {details} = account;
				// see https://support.google.com/calendar/thread/23205641/advanced-embed-option-descriptions?hl=en
				const params = {
					src: details.id,
					mode: 'WEEK',	// WEEK, AGENDA or none for MONTH
					ctz: 'America/New_York',
					wkst: 1,		// 1 = Sunday, 2 = Monday, etc.
					showPrint: 0,
					showTitle: 0,
					showTz: 0,
				}	
				return `https://calendar.google.com/calendar/embed?` + new URLSearchParams(params);
			}
		}
		return null;
	}, [entities, group]);

	return (
		<iframe 
			title='Google calendar'
			src={calendarLink}
			style={{border: 0, width: '100%', height: 400}} 
			scrolling="no"
		/>
	)
}

export default ShowCalendar;