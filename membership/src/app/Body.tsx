import React from 'react';
import {Routes, Route} from 'react-router-dom';
import styled from '@emotion/styled';

import {useAppSelector} from '../store/hooks';

import Members from '../members/Members';
import Sessions from '../meetings/Sessions';
import ImatMeetings from '../meetings/ImatMeetings';
import Breakouts from '../meetings/Breakouts';
import Attendees from '../meetings/Attendees';

import {selectUserMembershipAccess, AccessLevel} from '../store/user';

const Main = styled.main`
	flex: 1;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	align-items: center;
`;

function Body() {
	const access = useAppSelector(selectUserMembershipAccess);

	function renderComponent(minAccess: number, Component: () => JSX.Element) {
		if (access < minAccess)
			return <span>You do not have permission to view this data</span>
		return (
			<React.Suspense fallback={<div>Loading...</div>}>
				<Component />
			</React.Suspense>
		)
	}

	return (
		<Main>
			<Routes>
				<Route
					path="/"
					element={renderComponent(AccessLevel.admin, Members)}
				/>
				<Route
					path="/sessions"
					element={renderComponent(AccessLevel.admin, Sessions)}
				/>
				<Route
					path="/sessions/imat"
					element={renderComponent(AccessLevel.admin, ImatMeetings)}
				/>
				<Route
					path="/sessions/:session_id/breakouts"
					element={renderComponent(AccessLevel.admin, Breakouts)}
				/>
				<Route
					path="/sessions/:session_id/breakout/:breakout_id/attendees"
					element={renderComponent(AccessLevel.admin, Attendees)}
				/>
				<Route
					path="/sessions/:session_id/attendees"
					element={renderComponent(AccessLevel.admin, Attendees)}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
