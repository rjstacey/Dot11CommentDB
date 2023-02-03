import React from 'react';
import {Switch, Route} from 'react-router-dom';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';

import Accounts from '../accounts/Accounts';
import Organization from '../organization/Organization';
import Sessions from '../sessions/Sessions';
import Meetings from '../meetings/Meetings';
import Calendar from '../calendar/Calendar';
import WebexMeetings from '../webexMeetings/WebexMeetings';
import ImatMeetings from '../imat/ImatMeetings';
import ImatBreakouts from '../imat/ImatBreakouts';
import ImatBreakoutAttendance from '../imat/ImatBreakoutAttendance';
import Ieee802World from '../ieee802World/Ieee802World';

import {selectUserMeetingsAccess, AccessLevel} from '../store/user';

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
	const access = useSelector(selectUserMeetingsAccess);

	return (
		<Main>
			<Switch>
				<RestrictedRoute
					path="/accounts"
					access={access}
					minAccess={AccessLevel.admin}
					component={Accounts}
				/>
				<RestrictedRoute
					path="/:groupName/organization"
					access={access}
					minAccess={AccessLevel.ro}
					component={Organization}
				/>
				<RestrictedRoute
					path="/:groupName/sessions"
					access={access}
					minAccess={AccessLevel.ro}
					component={Sessions}
				/>
				<RestrictedRoute
					path="/:groupName/:sessionId/meetings"
					access={access}
					minAccess={AccessLevel.ro}
					component={Meetings}
				/>
				<RestrictedRoute
					path="/:groupName/:sessionId/webexMeetings"
					access={access}
					exact
					minAccess={AccessLevel.ro}
					component={WebexMeetings}
				/>
				<RestrictedRoute
					path="/:groupName/:sessionId/imatBreakouts"
					access={access}
					exact
					minAccess={AccessLevel.ro}
					component={ImatBreakouts}
				/>
				<RestrictedRoute
					path="/:groupName/calendar"
					access={access}
					minAccess={AccessLevel.ro}
					component={Calendar}
				/>
				<RestrictedRoute
					path="/:groupName/imatMeetings"
					access={access}
					exact
					minAccess={AccessLevel.ro}
					component={ImatMeetings}
				/>
				<RestrictedRoute
					path="/:groupName/imatMeetings/:meetingNumber"
					access={access}
					exact
					minAccess={AccessLevel.ro}
					component={ImatBreakouts}
				/>
				<RestrictedRoute
					path="/:groupName/imatMeetings/:meetingNumber/:breakoutNumber"
					access={access}
					minAccess={AccessLevel.ro}
					component={ImatBreakoutAttendance}
				/>
				<RestrictedRoute
					path="/:groupName/ieee802World"
					access={access}
					exact
					minAccess={AccessLevel.ro}
					component={Ieee802World}
				/>
			</Switch>
		</Main>
	)
}

export default Body;
