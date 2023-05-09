import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { ErrorModal, ConfirmModal } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectUserAccessLevel, AccessLevel } from '../store/user';

const Comments = React.lazy(() => import('../comments/Comments'));
const Results = React.lazy(() => import('../results/Results'));
const Reports = React.lazy(() => import('../reports/Reports'));

const Ballots = React.lazy(() => import('../ballots/Ballots'));
const Epolls = React.lazy(() => import('../ballots/Epolls'));

const VotersPools = React.lazy(() => import('../ballotVoters/VotersPools'));
const Voters = React.lazy(() => import('../ballotVoters/Voters'));

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

	const access = useAppSelector(selectUserAccessLevel);

	function renderComponent(minAccess: number, Component: React.ComponentType<{access: number}>) {
		if (access < minAccess)
			return <span>You do not have permission to view this data</span>
		return (
			<React.Suspense fallback={<div>Loading...</div>}>
				<Component access={access} />
			</React.Suspense>
		)
	}

	return (
		<Main>
			<Routes>
				<Route
					path="/ballots/:ballotId?"
					element={renderComponent(AccessLevel.none, Ballots)}
				/>
				<Route
					path="/epolls"
					element={renderComponent(AccessLevel.none, Epolls)}
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
				<Route
					path="/voters"
					element={renderComponent(AccessLevel.none, VotersPools)}
				/>
				<Route
					path="/voters/:votingPoolName"
					element={renderComponent(AccessLevel.none, Voters)}
				/>
			</Routes>
			<ErrorModal />
			<ConfirmModal />
		</Main>
	)
}

export default Body;
