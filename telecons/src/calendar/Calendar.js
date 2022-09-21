import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {selectCurrentGroupId} from '../store/current';
import {loadCalendarAccounts, selectCalendarAccountsState} from '../store/calendarAccounts';

import GroupPathSelector from '../components/GroupPathSelector';
import TopRow from '../components/TopRow';

const MainIframe = styled.iframe`
	flex: 1;
	width: 100%;
	border: 0;
`;

function Calendar() {
	const dispatch = useDispatch();
	const {entities} = useSelector(selectCalendarAccountsState);
	const groupId = useSelector(selectCurrentGroupId);

	React.useEffect(() => {
		dispatch(loadCalendarAccounts());
	}, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

	const calendarLink = React.useMemo(() => {
		for (const account of Object.values(entities)) {
			if (account.groups.includes(groupId) && account.details) {
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
	}, [entities, groupId]);

	return (
		<>
			<TopRow>
				<GroupPathSelector />
			</TopRow>
			<MainIframe 
				title='Google calendar'
				src={calendarLink}
				scrolling="no"
			/>
		</>
	)
}

export default Calendar;
