import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppSelector } from '../store/hooks';

import Accounts from '../accounts/Accounts';
import Sessions from '../sessions/Sessions';
import Meetings from '../meetings/Meetings';
import Calendar from '../calendar/Calendar';
import WebexMeetings from '../webexMeetings/WebexMeetings';
import ImatMeetings from '../imat/ImatMeetings';
import ImatBreakouts from '../imat/ImatBreakouts';
import ImatMeetingAttendance from '../imat/ImatMeetingAttendance';
import ImatBreakoutAttendance from '../imat/ImatBreakoutAttendance';
import Ieee802World from '../ieee802World/Ieee802World';
import Reports from '../reports/Reports';

import { selectUserMeetingsAccess, AccessLevel } from '../store/user';

const Main = styled.main`
	flex: 1;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	align-items: center;
`;

const Content = styled.div`
	flex: 1;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.5;
	font-style: italic;
`;

function Root() {
	return (
		<Content>
			<div>Meetings</div>
		</Content>
	)
}

function Body() {
	const access = useAppSelector(selectUserMeetingsAccess);

	function renderComponent(minAccess: number, Component: React.FC) {
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
					path="/accounts"
					element={renderComponent(AccessLevel.admin, Accounts)}
				/>
				<Route
					path="/:groupName/sessions"
					element={renderComponent(AccessLevel.ro, Sessions)}
				/>
				<Route
					path="/:groupName/meetings"
					element={renderComponent(AccessLevel.ro, Meetings)}
				/>
				<Route
					path="/:groupName/webexMeetings"
					element={renderComponent(AccessLevel.ro, WebexMeetings)}
				/>
				<Route
					path="/:groupName/imatBreakouts/:meetingNumber?"
					element={renderComponent(AccessLevel.ro, ImatBreakouts)}
				/>
				<Route
					path="/:groupName/calendar"
					element={renderComponent(AccessLevel.ro, Calendar)}
				/>
				<Route
					path="/:groupName/imatMeetings"
					element={renderComponent(AccessLevel.ro, ImatMeetings)}
				/>
				<Route
					path="/:groupName/imatAttendance/:meetingNumber/:breakoutNumber"
					element={renderComponent(AccessLevel.ro, ImatBreakoutAttendance)}
				/>
				<Route
					path="/:groupName/imatAttendance/:meetingNumber"
					element={renderComponent(AccessLevel.ro, ImatMeetingAttendance)}
				/>
				<Route
					path="/:groupName/ieee802World"
					element={renderComponent(AccessLevel.ro, Ieee802World)}
				/>
				<Route
					path="/:groupName/reports/:meetingNumber?"
					element={renderComponent(AccessLevel.ro, Reports)}
				/>
				<Route
					path="/:groupName?"
					element={<Root />}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
