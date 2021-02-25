import React from 'react'
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'

import Account, {SignIn} from './general/Login'
import Users from './users/Users'
import VotersPools from './voters/VotersPools'
import Voters from './voters/Voters'
import Ballots from './ballots/Ballots'
import Epolls from './ballots/Epolls'
import Results from './results/Results'
import Comments from './comments/Comments'
import Reports from './reports/Reports'
import ErrorModal from './modals/ErrorModal'
import ConfirmModal from './modals/ConfirmModal'
import {init as iconInit} from './general/Icons'

import {loginGetState, AccessLevel} from './store/login'

iconInit()

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	align-items: center;
`;

const Header = styled.header`
	max-width: 1400px;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin: 10px;
`;

const Nav = styled.nav`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	justify-content: center;
	& > a {
		display: inline-block;
		width: 100px;
		padding: 4px;
		margin: 0 4px;
		background: #efefef;
		text-align: center;
		&.active, :hover {
			background-color: rgba(0, 0, 0, 0.1);
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
	font-size: 28px;
	margin: 12px 8px 8px 8px;
	padding: 0;
	color: #008080;
	text-align: center;
`;

const RestrictedRoute = ({component: Component, access, minAccess, ...rest }) =>
	<Route
		{...rest}
		render={props =>
			access >= minAccess?
				<Component access={access} {...props} />:
				<Redirect to={{ pathname: "/Login", state: { from: props.location } }} />
		}
	/>

function App({user, access, loginGetState}) {

	React.useEffect(() => {loginGetState()}, [loginGetState]);

	return (
		<Router>
			<OuterDiv>
				<Header>
					<Title>802.11 Comment Resolution Tool</Title>
					<Nav>
						{(access >= AccessLevel.WGAdmin)&& 
							<React.Fragment>
								<NavLink to="/Users/" activeClassName='active'>Users</NavLink>
								<NavLink to="/Voters/" activeClassName='active'>Voter Pools</NavLink>
							</React.Fragment>}
						{(access >= AccessLevel.Public)&& 
							<React.Fragment>
								<NavLink to="/Ballots/" activeClassName='active'>Ballots</NavLink>
								{access >= AccessLevel.SubgroupAdmin && <NavLink to="/Results" activeClassName='active'>Results</NavLink>}
								<NavLink to="/Comments" activeClassName='active'>Comments</NavLink>
								{access >= AccessLevel.SubgroupAdmin && <NavLink to="/Reports" activeClassName='active'>Reports</NavLink>}
							</React.Fragment>}
					</Nav>
					<Account />
				</Header>
				<Main>
					<Switch>
						<RestrictedRoute
							path="/Users/"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Users}
						/>
						<RestrictedRoute
							path="/Voters/" exact
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={VotersPools}
						/>
						<RestrictedRoute
							path="/Voters/:votingPoolType/:votingPoolName"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Voters}
						/>
						<RestrictedRoute
							path="/Ballots/:ballotId?"
							access={access}
							minAccess={AccessLevel.Public}
							component={Ballots}
						/>
						<RestrictedRoute
							path="/Epolls/"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Epolls}
						/>
						<RestrictedRoute
							path="/Results/:ballotId?"
							access={access}
							minAccess={AccessLevel.SubgroupAdmin}
							component={Results}
						/>
						<RestrictedRoute
							path="/Comments/:ballotId?" exact
							access={access}
							minAccess={AccessLevel.Public}
							component={Comments} />
						<RestrictedRoute
							path="/Reports/:ballotId?" exact
							access={access}
							minAccess={AccessLevel.SubgroupAdmin}
							component={Reports}
						/>
						<Route path="/Login" exact component={SignIn} />
						<Route path="/" component={SignIn} />
					</Switch>
					<ErrorModal />
					<ConfirmModal />
				</Main>
			</OuterDiv>
		</Router>
	)
}

export default connect(
	(state, ownProps) => {
		const user = state.login.user
		return {
			access: user? user.Access: -1,
			user: user
		}
	},
	(dispatch, ownProps) => {
		return {
			loginGetState: () => dispatch(loginGetState())
		}
	}
)(App)
