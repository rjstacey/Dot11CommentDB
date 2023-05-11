import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { ErrorModal, ConfirmModal } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectUserAccessLevel, AccessLevel } from '../store/user';

import Comments from '../comments/Comments';
import Results from '../results/Results';
import Reports from '../reports/Reports';

import Ballots from '../ballots/Ballots';
import Epolls from '../ballots/Epolls';

import VotersPools from '../ballotVoters/VotersPools';
import Voters from '../ballotVoters/Voters';

const Main = styled.main`
	flex: 1;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	align-items: center;
`;

/* Note that the renderComponent funciton is only called once at startup. It can be made to execute each time a path
 * is selected by using Component={() => renderComponent()} */
function Body() {

	const access = useAppSelector(selectUserAccessLevel);

	function renderComponent(minAccess: number, Component: React.ComponentType<{}>) {
		if (access < minAccess)
			return <span>You do not have permission to view this data</span>
		return <Component />
	}

	return (
		<Main>
			<Routes>
				<Route
					path="/ballots"
					element={renderComponent(AccessLevel.ro, Ballots)}
				/>
				<Route
					path="/epolls"
					element={renderComponent(AccessLevel.none, Epolls)}
				/>
				<Route
					path="/voters"
					element={renderComponent(AccessLevel.none, VotersPools)}
				/>
				<Route
					path="/voters/:votingPoolName"
					element={renderComponent(AccessLevel.none, Voters)}
				/>
				<Route
					path="/results/:ballotId?"
					element={renderComponent(AccessLevel.none, Results)}
				/>
				<Route
					path="/comments/:ballotId?"
					element={renderComponent(AccessLevel.none, Comments)}
				/>
				<Route
					path="/reports/:ballotId?"
					element={renderComponent(AccessLevel.none, Reports)}
				/>
			</Routes>
			<ErrorModal />
			<ConfirmModal />
		</Main>
	)
}

export default Body;
