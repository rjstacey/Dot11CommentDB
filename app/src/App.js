import React from 'react'
import {BrowserRouter as Router, Switch, Route, NavLink} from 'react-router-dom'
import {connect} from 'react-redux'
import {loginGetState, AccessLevel} from './actions/login'
import Account from './general/Login'
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

import styled from '@emotion/styled'

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


function App({access, loginGetState}) {

	React.useEffect(() => {loginGetState()}, []);

	return (
		<Router>
			<OuterDiv>
				<Header>
					<Title>802.11 Comment Resolution Tool</Title>
					<Nav>
							{access > AccessLevel.Public &&
								<React.Fragment>
									<NavLink to="/Users/" activeClassName='active'>Users</NavLink>
									{access > AccessLevel.SubgroupAdmin && <NavLink to="/Voters/" activeClassName='active'>Voter Pools</NavLink>}
									<NavLink to="/Ballots/" activeClassName='active'>Ballots</NavLink>
									<NavLink to="/Results" activeClassName='active'>Results</NavLink>
									<NavLink to="/Comments" activeClassName='active'>Comments</NavLink>
									<NavLink to="/Reports" activeClassName='active'>Reports</NavLink>
								</React.Fragment>}
					</Nav>
					<Account />
				</Header>
				<Main>
					<Switch>
						<Route path="/" exact component={null} />
						{access > AccessLevel.Public &&
							<React.Fragment>
								<Route path="/Users/" component={Users} />
								{access > AccessLevel.SubgroupAdmin && <Route path="/Voters/" exact component={VotersPools} />}
								{access > AccessLevel.SubgroupAdmin && <Route path="/Voters/:votingPoolType/:votingPoolName" component={Voters} />}
								<Route path="/Ballots/:ballotId?" component={Ballots} />
								<Route path="/Epolls/" component={Epolls} />
								<Route path="/Results/:ballotId?" component={Results} />
								<Route path="/Comments/:ballotId?" exact component={Comments} />
								<Route path="/Reports/:ballotId?" exact component={Reports} />
							</React.Fragment>}
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
			access: user? user.Access: AccessLevel.Public
		}
	},
	(dispatch, ownProps) => {
		return {
			loginGetState: () => dispatch(loginGetState())
		}
	}
)(App)
