import React from 'react';
import {Routes, Route} from 'react-router-dom';
import styled from '@emotion/styled';

import {useAppSelector} from '../store/hooks';

import Members from '../members/Members';
import Attendances from '../attendances/Attendances';
import BallotParticipation from '../ballotParticipation/BallotParticipation';

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
					path="/attendances"
					element={renderComponent(AccessLevel.admin, Attendances)}
				/>
				<Route
					path="/ballotParticipation"
					element={renderComponent(AccessLevel.admin, BallotParticipation)}
				/>
			</Routes>
		</Main>
	)
}

export default Body;
