import React from 'react';
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom';
import styled from '@emotion/styled';

import Account from 'dot11-components/general/Account';
import {ErrorModal, ConfirmModal} from 'dot11-components/modals';
import {AccessLevel} from 'dot11-components/lib/user';

import Accounts from './accounts/Accounts';
import Telecons from './telecons/Telecons';
import {WebexAccountAuth} from './accounts/WebexAccounts';
import {CalendarAccountAuth} from './accounts/CalendarAccounts';
import Organization from './organization/Organization';

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
				<Redirect to={{ pathname: "/login", state: { from: props.location } }} />
		}
	/>

function App({user, access}) {

	return (
		<Router basename='/telecons'>
			<OuterDiv>
				<Header>
					<Title>802.11 Telecon Scheduling</Title>  
					<Nav>
						<NavLink to="/organization" activeClassName='active'>Organization</NavLink>
						<NavLink to="/accounts" activeClassName='active'>Accounts</NavLink>
						<NavLink to="/telecons/" activeClassName='active'>Telecons</NavLink>
					</Nav>
					<Account user={user} />
				</Header>
				<Main>
					<Switch>
						<RestrictedRoute
							path="/telecons/:groupName?"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Telecons}
						/>
						<RestrictedRoute
							path="/accounts"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Accounts}
						/>
						<RestrictedRoute
							path="/organization"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Organization}
						/>
						<RestrictedRoute
							path="/webex/auth"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={WebexAccountAuth}
						/>
						<RestrictedRoute
							path="/calendar/auth"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={CalendarAccountAuth}
						/>
					</Switch>
					<ErrorModal />
					<ConfirmModal />
				</Main>
			</OuterDiv>
		</Router>
	)
}

export default App
