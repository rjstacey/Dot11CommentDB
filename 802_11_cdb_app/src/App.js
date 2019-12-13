import React from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import LoginForm from './Login';
import Users from './Users';
import Ballots from './Ballots';
import Epolls from './Epolls';
import Comments from './Comments';
import CommentDetail from './CommentDetail';
import Results from './Results';
import VoterPools from './VoterPools';
import Voters from './Voters';
import ErrorModal from './ErrorModal';
import {init as iconInit} from './Icons'
import styles from './App.css'


class App extends React.Component {

	render() {
		iconInit();
		return (
			<Router>
				<div id='App'>
					<header className={styles.header}>
						<h3 className={styles.title}>802.11 Comment Database</h3>
						<nav>
							<ul>
								<li><Link to="/">Home</Link></li>
								<li><Link to="/Users/">Users</Link></li>
								<li><Link to="/Voters/">Voters</Link></li>
								<li><Link to="/Ballots/">Ballots</Link></li>
								<li><Link to="/Results">Results</Link></li>
								<li><Link to="/Comments">Comments</Link></li>
							</ul>
						</nav>
					</header>
					<main className={styles.main}>
						<Route path="/" exact component={LoginForm} />
						<Route path="/Users/" component={Users} />
						<Route path="/Voters/" exact component={VoterPools} />
						<Route path="/Voters/:votingPoolId" component={Voters} />
						<Route path="/Ballots/" component={Ballots} />
						<Route path="/Epolls/" component={Epolls} />
						<Route path="/Results/:ballotId?" component={Results} />
						<Route path="/Comments/:ballotId?" exact component={Comments} />
						<Route path="/Comments/:ballotId/:commentId(\d+)" component={CommentDetail} />
						<ErrorModal />
					</main>
				</div>
			</Router>
		)
	}
}

export default App;
