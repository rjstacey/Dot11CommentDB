import React from 'react';
import {Switch, Route} from 'react-router-dom';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';

import Members from '../members/Members';
import Sessions from '../meetings/Sessions';
import ImatMeetings from '../meetings/ImatMeetings';
import Breakouts from '../meetings/Breakouts';
import Attendees from '../meetings/Attendees';

import {selectUserMembershipAccess, AccessLevel} from '../store/user';

const Main = styled.main`
	flex: 1;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	align-items: center;
`;

const RestrictedRoute = ({component: Component, access, minAccess, ...rest }) =>
	<Route
		{...rest}
		render={props =>
			access >= minAccess?
				<React.Suspense fallback={<div>Loading...</div>}>
					<Component access={access} {...props} />
				</React.Suspense>:
				<span>You do not have permission to view this data</span>
		}
	/>

function Body() {
	const access = useSelector(selectUserMembershipAccess);

	return (
		<Main>
			<Switch>
				<RestrictedRoute
					path="/members"
					exact
					access={access}
					minAccess={AccessLevel.admin}
					component={Members}
				/>
				<RestrictedRoute
					path="/sessions"
					exact
					access={access}
					minAccess={AccessLevel.admin}
					component={Sessions}
				/>
				<RestrictedRoute
					path="/sessions/imat"
					exact
					access={access}
					minAccess={AccessLevel.admin}
					component={ImatMeetings}
				/>
				<RestrictedRoute
					path="/sessions/:session_id/breakouts"
					exact
					access={access}
					minAccess={AccessLevel.admin}
					component={Breakouts}
				/>
				<RestrictedRoute
					path="/sessions/:session_id/breakout/:breakout_id/attendees"
					access={access}
					minAccess={AccessLevel.admin}
					component={Attendees}
				/>
				<RestrictedRoute
					path="/sessions/:session_id/attendees"
					exact
					access={access}
					minAccess={AccessLevel.admin}
					component={Attendees}
				/>
			</Switch>
		</Main>
	)
}

export default Body;
