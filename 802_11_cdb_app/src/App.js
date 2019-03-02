import React from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import LoginForm from './Login';
import Users from './Users';
import Ballots from './Ballots';
import Comments from './Comments';
import Results from './Results';
import VoterPools from './VoterPools';
import ErrorModal from './ErrorModal'
import './App.css'

class App extends React.Component {

	render() {
		return (
			<Router>
				<div id='App'>
					<header>
						<h3 className="AppTitle">802.11 Comment Database</h3>
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
					<main>
						<Route path="/" exact component={LoginForm} />
						<Route path="/Users/" component={Users} />
						<Route path="/Voters/" component={VoterPools} />
						<Route path="/Ballots/" component={Ballots} />
						<Route path="/Results/:ballotId?" component={Results} />
						<Route path="/Comments/:ballotId?" component={Comments} />
						<ErrorModal />
					</main>
				</div>
			</Router>
		)
	}
}

export default App;
