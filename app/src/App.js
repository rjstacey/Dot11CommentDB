import React, {useEffect} from 'react'
import {BrowserRouter as Router, Switch, Route, Link, useLocation} from 'react-router-dom'
import {connect} from 'react-redux'
import {loginGetState} from './actions/login'
import LoginForm from './general/Login'
import Users from './users/Users'
import VoterPools from './voters/VoterPools'
import Voters from './voters/Voters'
import Ballots from './ballots/Ballots'
import BallotDetail from './ballots/BallotDetail'
import Epolls from './ballots/Epolls'
import Results from './results/Results'
import Comments from './comments/Comments'
import CommentDetail from './comments/CommentDetail'
import ErrorModal from './modals/ErrorModal'
import ConfirmModal from './modals/ConfirmModal'
import {init as iconInit} from './general/Icons'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

iconInit()

/*
function useQuery() {
	return new URLSearchParams(useLocation().search)
}

function CommentsRoute(props) {
	const query = useQuery()

	if (query.get('CIDs')) {
		return <CommentDetail {...props} />
	}
	else {
		return <Comments {...props} />
	}
}
*/
const titleCss = css`
	display: inline-block;
	font-family: "Arial", "Helvetica", sans-serif;
	font-weight: 400;
	font-size: 28px;
	margin: 12px 8px 8px 8px;
	padding: 0;
	color: #008080;
	text-align: center;`

const headerCss = css`
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

const mainCss = css`
	position: relative;
	margin: 0 auto;
	align-items: center;`

function App({access, loginGetState}) {

	useEffect(() => {
		loginGetState()
	}, [])

	return (
		<Router>
			<div id='App'>
				<header css={headerCss}>
					<h3 css={titleCss}>802.11 Comment Resolution Tool</h3>
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
				</header>
				<main css={mainCss}>
					<Switch>
						<Route path="/" exact component={LoginForm} />
						{access > 0 && <Route path="/Users/" component={Users} />}
						{access > 0 && <Route path="/Voters/" exact component={VoterPools} />}
						{access > 0 && <Route path="/Voters/:votingPoolType/:votingPoolName" component={Voters} />}
						<Route path="/Ballots/" exact component={Ballots} />
						<Route path="/Epolls/" component={Epolls} />
						<Route path="/ImportEpoll/:epollNum" component={BallotDetail} />
						<Route path="/Ballot/:ballotId?" component={BallotDetail} />
						<Route path="/Results/:ballotId?" component={Results} />
						<Route path="/Comments/:ballotId?" exact component={Comments} />
					</Switch>
					<ErrorModal />
					<ConfirmModal />
				</main>
			</div>
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
