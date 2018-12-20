import React from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import LoginForm from './Login.js';
import Users from './Users.js';
import Ballots from './Ballots.js';
import Comments from './Comments.js';
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
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/Users/">Users</Link>
                </li>
                <li>
                  <Link to="/Ballots/">Ballots</Link>
                </li>
                <li>
                  <Link to="/Comments/">Comments</Link>
                </li>
              </ul>
            </nav>
          </header>
          <main>
            <Route path="/" exact component={LoginForm} />
            <Route path="/Users/" component={Users} />
            <Route path="/Ballots/" component={Ballots} />
            <Route path="/Comments/" component={Comments} />
          </main>
        </div>
      </Router>
    )
  }
}

export default App;
