import React from 'react';
import {Switch, Route} from 'react-router-dom';
import styled from '@emotion/styled';

import {AccessLevel} from 'dot11-components/lib/user';
import {ErrorModal, ConfirmModal} from 'dot11-components/modals';

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

const RestrictedRoute = ({component: Component, access, minAccess, ...rest }) =>
	<Route
		{...rest}
		render={props =>
			access >= minAccess?
				<React.Suspense fallback={<div>Loading...</div>}>
					<Component access={access} {...props} />
				</React.Suspense>:
				<span>You do not have permission to view this data</span>
		}
	/>

function Body({user, access}) {

	return (
		<Main>
			<Switch>
				<RestrictedRoute
					path="/ballots/:ballotId?"
					access={access}
					minAccess={AccessLevel.Public}
					component={Ballots}
				/>
				<RestrictedRoute
					path="/epolls"
					access={access}
					minAccess={AccessLevel.WGAdmin}
					component={Epolls}
				/>
				<RestrictedRoute
					path="/results/:ballotId?"
					access={access}
					minAccess={AccessLevel.SubgroupAdmin}
					component={Results}
				/>
				<RestrictedRoute
					path="/comments/:ballotId?" exact
					access={access}
					minAccess={AccessLevel.Public}
					component={Comments} />
				<RestrictedRoute
					path="/reports/:ballotId?" exact
					access={access}
					minAccess={AccessLevel.Public}
					component={Reports}
				/>
				<RestrictedRoute
					path="/voters" exact
					access={access}
					minAccess={AccessLevel.WGAdmin}
					component={VotersPools}
				/>
				<RestrictedRoute
					path="/voters/:votingPoolName"
					access={access}
					minAccess={AccessLevel.WGAdmin}
					component={Voters}
				/>
			</Switch>
			<ErrorModal />
			<ConfirmModal />
		</Main>
	)
}

export default Body;
