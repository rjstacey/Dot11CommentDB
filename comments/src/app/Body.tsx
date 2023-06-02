import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from '@emotion/styled';

import { ErrorModal, ConfirmModal } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { AccessLevel } from '../store/user';
import { selectWorkingGroupPermissions } from '../store/groups';

import Comments from '../comments/Comments';
import Results from '../results/Results';
import Reports from '../reports/Reports';

import Ballots from '../ballots/Ballots';
import Epolls from '../ballots/Epolls';

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
			<div>Comment Resolution Tool</div>
		</Content>
	)
}

/* Note that the renderComponent function is mounts the component once at startup. It can be forced to re-mount each time a path
 * is selected by using Component={() => renderComponent()} */
function Body() {

	const permissions = useAppSelector(selectWorkingGroupPermissions);

	function renderComponent(scope: string, minAccess: number, Component: React.ComponentType<{}>) {
		if ((permissions[scope] || 0) < minAccess)
			return <span>You do not have permission to view this data</span>
		return <Component />
	}

	return (
		<Main>
			<Routes>
				<Route
					path="/:groupName/ballots"
					element={renderComponent('ballots', AccessLevel.ro, Ballots)}
				/>
				<Route
					path="/:groupName/epolls"
					element={renderComponent('ballots', AccessLevel.admin, Epolls)}
				/>
				<Route
					path="/:groupName/voters/:ballotId?"
					element={renderComponent('ballots', AccessLevel.rw, Voters)}
				/>
				<Route
					path="/:groupName/results/:ballotId?"
					element={renderComponent('results', AccessLevel.ro, Results)}
				/>
				<Route
					path="/:groupName/comments/:ballotId?"
					element={renderComponent('comments', AccessLevel.ro, Comments)}
				/>
				<Route
					path="/:groupName/reports/:ballotId?"
					element={renderComponent('comments', AccessLevel.ro, Reports)}
				/>
				<Route
					path="/:groupName?"
					element={<Root />}
				/>
			</Routes>
			<ErrorModal />
			<ConfirmModal />
		</Main>
	)
}

export default Body;
