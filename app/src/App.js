import React, {useEffect} from 'react'
import {BrowserRouter as Router, Switch, Route, Link, useLocation} from "react-router-dom"
import {connect} from 'react-redux'
import {loginGetState} from './actions/login'
import LoginForm from './Login'
import Users from './Users'
import Ballots from './Ballots'
import BallotDetail from './BallotDetail'
import Epolls from './Epolls'
import Comments from './Comments'
import CommentDetail from './CommentDetail'
import Results from './Results'
import VoterPools from './VoterPools'
import Voters from './Voters'
import ErrorModal from './ErrorModal'
import ConfirmModal from './ConfirmModal'
import {init as iconInit} from './Icons'
import styles from './css/App.css'

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

function App(props) {
	const {access, dispatch} = props

	iconInit()

	useEffect(() => {
		dispatch(loginGetState())
	}, [])

	return (
		<Router>
			<div id='App'>
				<header className={styles.header}>
					<h3 className={styles.title}>802.11 Comment Resolution Tool</h3>
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
				<main className={styles.main}>
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
						<Route path="/Comments/:ballotId?" exact component={CommentsRoute} />
					</Switch>
					<ErrorModal />
					<ConfirmModal />
				</main>
			</div>
		</Router>
	)
}

function mapStateToProps(state) {
	const {login} = state
	return {
		access: login.Access,
		loggedIn: login.LoggedIn
  	}
}
export default connect(mapStateToProps)(App)
