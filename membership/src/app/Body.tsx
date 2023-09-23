import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppSelector } from '../store/hooks';

import Members from '../members/Members';
import Groups from '../groups/Groups';
import SessionParticipation from '../sessionParticipation/SessionParticipation';
import BallotParticipation from '../ballotParticipation/BallotParticipation';
import SessionAttendance from '../sessionAttendance/SessionAttendance';
import Reports from '../reports/Reports';

import { selectUserMembersAccess, AccessLevel } from '../store/user';

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
			<div>Membership</div>
		</Content>
	)
}

function Body() {
	const access = useAppSelector(selectUserMembersAccess);

	function renderComponent(minAccess: number, Component: React.ComponentType) {
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
					path="/members/:groupName"
					element={renderComponent(AccessLevel.admin, Members)}
				/>
				<Route
					path="/groups/:groupName?"
					element={renderComponent(AccessLevel.ro, Groups)}
				/>
				<Route
					path="/sessionParticipation/:groupName"
					element={renderComponent(AccessLevel.admin, SessionParticipation)}
				/>
				<Route
					path="/ballotParticipation/:groupName"
					element={renderComponent(AccessLevel.admin, BallotParticipation)}
				/>
				<Route
					path="/sessionAttendance/:groupName"
					element={renderComponent(AccessLevel.admin, SessionAttendance)}
				/>
				<Route
					path="/reports/:groupName"
					element={renderComponent(AccessLevel.admin, Reports)}
				/>
				<Route
					path="/:groupName?"
					element={renderComponent(AccessLevel.none, Root)}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
