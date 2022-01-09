import React from 'react';
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom';
import styled from '@emotion/styled';

import Account from 'dot11-components/general/Account';
import {AccessLevel} from 'dot11-components/lib/user';
import {ErrorModal, ConfirmModal} from 'dot11-components/modals';

import LiveUpdateSwitch from './LiveUpdateSwitch';
import OnlineIndicator from './OnlineIndicator';

const Comments = React.lazy(() => import('./comments/Comments'));
const Results = React.lazy(() => import('./results/Results'));
const Reports = React.lazy(() => import('./reports/Reports'));

const Ballots = React.lazy(() => import('./ballots/Ballots'));
const Epolls = React.lazy(() => import('./ballots/Epolls'));

const VotersPools = React.lazy(() => import('./ballotVoters/VotersPools'));
const Voters = React.lazy(() => import('./ballotVoters/Voters'));

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	align-items: center;
`;

const Header = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  /*box-shadow: 0 4px 13px -3px rgb(0 0 0 / 10%);
  border-bottom: 1px solid #d2d2d2;*/
  width: 100%;
  padding-left: 2rem;
  padding-right: 2rem;
  box-sizing: border-box;
  height: 50px;
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  justify-content: center;
  & > a {
		display: inline-block;
		/*width: 100px;*/
		padding: 0.25rem 1.25rem;
		margin: 0 4px;
		/*background: #efefef;*/
		text-align: center;
		color: #005979;
		font-size: 18px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		&.active, :hover {
		  /*background-color: rgba(0, 0, 0, 0.1);*/
		  color: black;
		}
  }
`;

const Main = styled.main`
  flex: 1;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  align-items: center;
`;

const Title = styled.h3`
  display: inline-block;
  font-family: "Arial", "Helvetica", sans-serif;
  font-weight: 400;
  font-size: 24px;
  margin: 0;
  padding: 0;
  color: #008080;
  text-align: center;
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

function App({user, access}) {

	return (
		<Router basename='/comments'>
			<OuterDiv>
				<Header>
					<Title>802.11 Comment Resolution</Title>
					<Nav>
						{access >= AccessLevel.Public && <NavLink to="/ballots/" activeClassName='active'>Ballots</NavLink>}
						{access >= AccessLevel.WGAdmin && <NavLink to="/voters/" activeClassName='active'>Ballot voters</NavLink>}
						{access >= AccessLevel.SubgroupAdmin && <NavLink to="/results" activeClassName='active'>Results</NavLink>}
						{access >= AccessLevel.Public && <NavLink to="/comments" activeClassName='active'>Comments</NavLink>}
						{access >= AccessLevel.Public && <NavLink to="/reports" activeClassName='active'>Reports</NavLink>}
					</Nav>
					<OnlineIndicator />
					<LiveUpdateSwitch />
					<Account user={user} />
				</Header>
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
			</OuterDiv>
		</Router>
	)
}

export default App;
