import React from 'react'
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'

import Account from 'dot11-components/general/Account'
import {AccessLevel} from 'dot11-components/lib/user'
import {ErrorModal, ConfirmModal} from 'dot11-components/modals'

import Ballots from './ballots/Ballots'
import Results from './results/Results'
import Comments from './comments/Comments'
import Reports from './reports/Reports'

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
	margin: 5px 10px;
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
	font-size: 24px;
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
				<Redirect to={{ pathname: "/login", state: { from: props.location } }} />
		}
	/>

function App({user, access}) {

	return (
		<Router basename='/comments'>
			<OuterDiv>
				<Header>
					<Title>802.11 Comment Resolution Tool</Title>
					<Nav>
						{access >= AccessLevel.Public && <>
							<NavLink to="/ballots/" activeClassName='active'>Ballots</NavLink>
							{access >= AccessLevel.SubgroupAdmin && <NavLink to="/results" activeClassName='active'>Results</NavLink>}
							<NavLink to="/comments" activeClassName='active'>Comments</NavLink>
							{access >= AccessLevel.SubgroupAdmin && <NavLink to="/reports" activeClassName='active'>Reports</NavLink>}
						</>}
					</Nav>
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
							minAccess={AccessLevel.SubgroupAdmin}
							component={Reports}
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
