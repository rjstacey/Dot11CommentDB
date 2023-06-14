import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppSelector } from '../store/hooks';

import Members from '../members/Members';
import SessionParticipation from '../sessionParticipation/SessionParticipation';
import BallotParticipation from '../ballotParticipation/BallotParticipation';
import SessionAttendance from '../sessionAttendance/SessionAttendance';

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
					path="/:groupName"
					element={renderComponent(AccessLevel.admin, Members)}
				/>
				<Route
					path="/:groupName/sessionParticipation"
					element={renderComponent(AccessLevel.admin, SessionParticipation)}
				/>
				<Route
					path="/:groupName/ballotParticipation"
					element={renderComponent(AccessLevel.admin, BallotParticipation)}
				/>
				<Route
					path="/:groupName/sessionAttendance"
					element={renderComponent(AccessLevel.admin, SessionAttendance)}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
