import React from 'react'
import {BrowserRouter as Router, Switch, Route, NavLink, Redirect} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'

import Account, {SignIn} from 'dot11-common/general/Login'
import {ErrorModal, ConfirmModal} from 'dot11-common/modals'
import {loginGetState, AccessLevel} from 'dot11-common/store/login'

import Members from './members/Members'
import MembersAttendance from './members/MembersAttendance'
import Sessions from './meetings/Sessions'
import ImatMeetings from './meetings/ImatMeetings'
import Breakouts from './meetings/Breakouts'
import Attendees from './meetings/Attendees'

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

const RestrictedRoute = ({component: Component, access, minAccess, ...rest }) =>
  <Route
	{...rest}
	render={props =>
	  access >= minAccess?
		<Component access={access} {...props} />:
		<Redirect to={{ pathname: "/Login", state: { from: props.location } }} />
	}
  />

function App({user, access, loginGetState}) {

	React.useEffect(() => {loginGetState()}, [loginGetState]);

	return (
		<Router>
			<OuterDiv>
				<Header>
					<Title>802.11 Member Management</Title>
					<Nav>
						<NavLink to="/Members/" activeClassName='active'>Members</NavLink>
						<NavLink to="/Members/AttendanceUpdate" activeClassName='active'>Attendance</NavLink>
						<NavLink to="/Sessions/" activeClassName='active'>Sessions</NavLink>
					</Nav>
					<Account />
				</Header>
				<Main>
					<Switch>
						<RestrictedRoute
							path="/Members/AttendanceUpdate"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={MembersAttendance}
						/>
						<RestrictedRoute
							path="/Members"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Members}
						/>
						<RestrictedRoute
							path="/Sessions/"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Sessions}
						/>
						<RestrictedRoute
							path="/ImatSessions/"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={ImatMeetings}
						/>
						<RestrictedRoute
							path="/Session/:session_id/Breakouts"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Breakouts}
						/>
						<RestrictedRoute
							path="/Session/:session_id/Breakout/:breakout_id/Attendees"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Attendees}
						/>
						<RestrictedRoute
							path="/Session/:session_id/Attendees"
							access={access}
							minAccess={AccessLevel.WGAdmin}
							component={Attendees}
						/>
						<Route path="/Login" exact component={SignIn} />
						<Route path="/" component={SignIn} />
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
			access: user? user.Access: -1,
			user: user
		}
	},
	{loginGetState}
)(App)

