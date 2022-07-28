import React from 'react';
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom';
import styled from '@emotion/styled';

import Account from 'dot11-components/general/Account';
import {ErrorModal, ConfirmModal} from 'dot11-components/modals';
import {AccessLevel} from 'dot11-components/lib/user';

import Accounts from './accounts/Accounts';
import Telecons from './telecons/Telecons';
import Calendar from './calendar/Calendar';
import {WebexAccountAuth} from './accounts/WebexAccounts';
import {CalendarAccountAuth} from './accounts/CalendarAccounts';
import Organization from './organization/Organization';
import ImatMeetings from './imatMeetings/ImatMeetings';
import ImatBreakouts from './imatMeetings/ImatBreakouts';
import ImatBreakoutAttendance from './imatMeetings/ImatBreakoutAttendance';
import WebexMeetings from './webexMeetings/WebexMeetings';
import Ieee802WorldSchedule from './ieee802WorldSchedule/Ieee802WorldSchedule';

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
						<NavLink to="/calendar/" activeClassName='active'>Calendar</NavLink>
						<NavLink to="/webexMeetings/" activeClassName='active'>Webex</NavLink>
						<NavLink to="/imatMeetings/" activeClassName='active'>IMAT</NavLink>
						<NavLink to="/ieee802WorldSchedule/" activeClassName='active'>802 World Schedule</NavLink>
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
							path="/calendar/auth"
							exact
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={CalendarAccountAuth}
						/>
						<RestrictedRoute
							path="/calendar/:groupName?"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Calendar}
						/>
						<RestrictedRoute
							path="/webex/auth"
							access={access}
							exact
							minAccess={AccessLevel.WGAdmin}
							component={WebexAccountAuth}
						/>
						<RestrictedRoute
							path="/webexMeetings/:groupName?"
							access={access}
							exact
							minAccess={AccessLevel.WGAdmin}
							component={WebexMeetings}
						/>
						<RestrictedRoute
							path="/imatMeetings"
							access={access}
							exact
							minAccess={AccessLevel.WGAdmin}
							component={ImatMeetings}
						/>
						<RestrictedRoute
							path="/imatMeetings/:meetingNumber"
							access={access}
							exact
							minAccess={AccessLevel.WGAdmin}
							component={ImatBreakouts}
						/>
						<RestrictedRoute
							path="/imatMeetings/:meetingNumber/:breakoutNumber"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={ImatBreakoutAttendance}
						/>
						<RestrictedRoute
							path="/ieee802WorldSchedule"
							access={access}
							exact
							minAccess={AccessLevel.WGAdmin}
							component={Ieee802WorldSchedule}
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
						
					</Switch>
					<ErrorModal />
					<ConfirmModal />
				</Main>
			</OuterDiv>
		</Router>
	)
}

export default App
