import React from 'react';
import { Routes, Route, Navigate, useLocation, useParams, useRouteError } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

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
import { selectWorkingGroups, selectWorkingGroupName, setWorkingGroupId, setWorkingGroup } from '../store/groups';

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

function ErrorPage() {
	const error: any = useRouteError();
	console.error(error);

	return (
		<div id="error-page">
			<h1>Oops!</h1>
			<p>Sorry, an unexpected error has occurred.</p>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}

function RedirectToCurrentGroup() {
	const wgName = useAppSelector(selectWorkingGroupName);
	const location = useLocation();
	console.log(location.pathname)
	let path = '/';
	if (wgName)
		path = `/${wgName}/${location.pathname}`;
	return <Navigate to={path} replace={true} />
}

function GroupComponent({minAccess, Component}: {minAccess: number; Component: React.FC}) {
	const dispatch = useAppDispatch();
	const currentGroupName = useAppSelector(selectWorkingGroupName);
	const groups = useAppSelector(selectWorkingGroups);
	const access = useAppSelector(selectUserMeetingsAccess);
	const {groupName} = useParams();
	if (groupName !== currentGroupName) {
		const newGroup = groups.find(g => g.name === groupName);
		if (newGroup) {
			dispatch(setWorkingGroupId(newGroup.id));
		}
		else {
			dispatch(setWorkingGroupId(null));
			return <Navigate to={'/'} replace />
		}
	}
	if (access < minAccess)
		return <span>You do not have permission to view this data</span>
	return <Component />
}

function Body() {
	const dispatch = useAppDispatch();
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
					path="/:groupName"
					loader={({params}) => {
						console.log(params)
						return dispatch(setWorkingGroup(params.groupName || null));
					}}
					//element={<Root/>}
				>
					<Route
						path=""
						element={<Root/>}
					/>
					<Route
						path="accounts"
						element={renderComponent(AccessLevel.admin, Accounts)}
						//element={<GroupComponent minAccess={AccessLevel.admin} Component={Accounts}/>}
					/>
					<Route
						path="sessions"
						element={renderComponent(AccessLevel.ro, Sessions)}
					/>
					<Route
						path="meetings"
						element={renderComponent(AccessLevel.ro, Meetings)}
					/>
					<Route
						path="webexMeetings"
						element={renderComponent(AccessLevel.ro, WebexMeetings)}
					/>
					<Route
						path="imatBreakouts/:meetingNumber?"
						element={renderComponent(AccessLevel.ro, ImatBreakouts)}
					/>
					<Route
						path="calendar"
						element={renderComponent(AccessLevel.ro, Calendar)}
					/>
					<Route
						path="imatMeetings"
						element={renderComponent(AccessLevel.ro, ImatMeetings)}
					/>
					<Route
						path="imatAttendance/:meetingNumber/:breakoutNumber"
						element={renderComponent(AccessLevel.ro, ImatBreakoutAttendance)}
					/>
					<Route
						path="imatAttendance/:meetingNumber"
						element={renderComponent(AccessLevel.ro, ImatMeetingAttendance)}
					/>
					<Route
						path="ieee802World"
						element={renderComponent(AccessLevel.ro, Ieee802World)}
					/>
					<Route
						path="reports/:meetingNumber?"
						element={renderComponent(AccessLevel.ro, Reports)}
					/>
					<Route
						path="*"
						element={<span>Invalid path</span>}
					/>
				</Route>
				<Route
					path="/accounts"
					element={<RedirectToCurrentGroup/>}
				/>
				<Route
					path="/:groupName?"
					element={<Root />}
					errorElement={<ErrorPage />}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
