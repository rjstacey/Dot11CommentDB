import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory} from 'react-router-dom';
import styled from '@emotion/styled';

import {selectGroupsState} from '../store/groups';
import {selectTeleconsState} from '../store/telecons';
import {loadCalendarAccounts, selectCalendarAccountsState} from '../store/calendarAccounts';

import GroupSelector from '../components/GroupSelector';
import TopRow from '../components/TopRow';

const MainIframe = styled.iframe`
	flex: 1;
	width: 100%;
	border: 0;
`;

function Calendar() {
	const dispatch = useDispatch();
	const {entities, valid, loading} = useSelector(selectCalendarAccountsState);
	const {entities: groupEntities, ids: groupIds} = useSelector(selectGroupsState);
	const history = useHistory();
	const {groupId} = useSelector(selectTeleconsState);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadCalendarAccounts());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const groups = React.useMemo(() => {
		return groupIds
			.map(id => groupEntities[id])
			.filter(group => group.type === 'c' || group.type === 'wg')
			.sort((groupA, groupB) => groupA.name.localeCompare(groupB.name))
	}, [groupEntities, groupIds]);

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

	function handleSetGroupId(groupId) {
		let url = '/telecons';
		const group = groupEntities[groupId];
		if (group) {
			const groupName = group? group.name: 'Unknown';
			url += `/${groupName}`;
		}
		history.push(url); // Redirect to page for selected group
	}

	return (
		<>
			<TopRow>
				<div style={{display: 'flex'}}>
					<label>Group:</label>
					<GroupSelector
						value={groupId}
						onChange={handleSetGroupId}
						options={groups}
					/>
				</div>
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
