import React from 'react';
import {Switch, Route} from 'react-router-dom';
import styled from '@emotion/styled';

import {AccessLevel} from 'dot11-components/lib/user';
import {ErrorModal, ConfirmModal} from 'dot11-components/modals';

import Accounts from '../accounts/Accounts';
import Telecons from '../telecons/Telecons';
import Calendar from '../calendar/Calendar';
import {WebexAccountAuth} from '../accounts/WebexAccounts';
import {CalendarAccountAuth} from '../accounts/CalendarAccounts';
import Organization from '../organization/Organization';
import ImatMeetings from '../imatMeetings/ImatMeetings';
import ImatBreakouts from '../imatMeetings/ImatBreakouts';
import ImatBreakoutAttendance from '../imatMeetings/ImatBreakoutAttendance';
import WebexMeetings from '../webexMeetings/WebexMeetings';
import Ieee802WorldSchedule from '../ieee802WorldSchedule/Ieee802WorldSchedule';

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

function Body({user, access}) {

	return (
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
	)
}

export default Body;
