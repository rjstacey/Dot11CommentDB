import React from 'react';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {selectCurrentGroupId} from '../store/current';

import {
	loadCalendarAccounts,
	selectCalendarAccountsState,
	CalendarAccount
} from '../store/calendarAccounts';

import PathGroupSelector from '../components/PathGroupSelector';
import TopRow from '../components/TopRow';

const MainIframe = styled.iframe`
	flex: 1;
	width: 100%;
	border: 0;
`;

function Calendar() {
	const dispatch = useAppDispatch();
	const {entities} = useAppSelector(selectCalendarAccountsState);
	const groupId = useAppSelector(selectCurrentGroupId);

	React.useEffect(() => {
		dispatch(loadCalendarAccounts());
	}, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

	const calendarLink = React.useMemo(() => {
		if (!groupId)
			return undefined;
		for (const account of (Object.values(entities) as CalendarAccount[])) {
			if (account.groups.includes(groupId) && account.details) {
				const {details} = account;
				// see https://support.google.com/calendar/thread/23205641/advanced-embed-option-descriptions?hl=en
				const params = {
					src: details.id,
					mode: 'WEEK',	// WEEK, AGENDA or none for MONTH
					ctz: 'America/New_York',
					wkst: '1',		// 1 = Sunday, 2 = Monday, etc.
					showPrint: '0',
					showTitle: '0',
					showTz: '0',
				}	
				return `https://calendar.google.com/calendar/embed?` + new URLSearchParams(params);
			}
		}
	}, [entities, groupId]);

	return (
		<>
			<TopRow>
				<PathGroupSelector />
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