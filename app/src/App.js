import React from 'react'
import {BrowserRouter as Router, Switch, Route, Link} from 'react-router-dom'
import {connect} from 'react-redux'
import {loginGetState} from './actions/login'
import LoginForm from './general/Login'
import Users from './users/Users'
import VoterPools from './voters/VoterPools'
import Voters from './voters/Voters'
import Ballots from './ballots/Ballots'
import Epolls from './ballots/Epolls'
import Results from './results/Results'
import Comments from './comments/Comments'
import ErrorModal from './modals/ErrorModal'
import ConfirmModal from './modals/ConfirmModal'
import {init as iconInit} from './general/Icons'

import styled from '@emotion/styled'

iconInit()

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;`

const Header = styled.header`
	display: flex;
	flex-direction: column;
	& > nav {
		display: inline-flex;
		flex-direction: row;
		justify-content: center;
	}
	& > nav ul {
		list-style-type: none;
		padding: 0 0;
	}
	& > nav ul li {
		display: inline-block;
		width: 100px;
		padding: 4px;
		margin: 0 4px;
		background: #efefef;
		text-align: center;
	}
	& > nav ul li:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}`

const Title = styled.h3`
	display: inline-block;
	font-family: "Arial", "Helvetica", sans-serif;
	font-weight: 400;
	font-size: 28px;
	margin: 12px 8px 8px 8px;
	padding: 0;
	color: #008080;
	text-align: center;`

const Main = styled.main`
	flex: 1;
	width: 100%;
	display: flex;
	flex-direction: column;
	position: relative;
	margin: 0 auto;
	justify-content: center;
	align-items: stretch;`

function App({access, loginGetState}) {

	React.useEffect(() => {
		loginGetState()
	}, [])

	return (
		<Router>
			<OuterDiv>
				<Header>
					<Title>802.11 Comment Resolution Tool</Title>
					<nav>
						<ul>
							<li><Link to="/">Home</Link></li>
							{access > 0 && <li><Link to="/Users/">Users</Link></li>}
							{access > 0 && <li><Link to="/Voters/">Voter Pools</Link></li>}
							<li><Link to="/Ballots/">Ballots</Link></li>
							<li><Link to="/Results">Results</Link></li>
							<li><Link to="/Comments">Comments</Link></li>
						</ul>
					</nav>
				</Header>
				<Main>
					<Switch>
						<Route path="/" exact component={LoginForm} />
						{access > 0 && <Route path="/Users/" component={Users} />}
						{access > 0 && <Route path="/Voters/" exact component={VoterPools} />}
						{access > 0 && <Route path="/Voters/:votingPoolType/:votingPoolName" component={Voters} />}
						<Route path="/Ballots/:ballotId?" component={Ballots} />
						<Route path="/Epolls/" component={Epolls} />
						<Route path="/Results/:ballotId?" component={Results} />
						<Route path="/Comments/:ballotId?" exact component={Comments} />
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
		return {
			access: state.login.Access
		}
	},
	(dispatch, ownProps) => {
		return {
			loginGetState: () => dispatch(loginGetState())
		}
	}
)(App)
