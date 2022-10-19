import React from 'react';
import {useSelector} from 'react-redux';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import {SplitPanel, Panel} from 'dot11-components/table';

import {
	selectCurrentSessionId,
} from '../store/current';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

import MeetingCalendar from './MeetingCalendar';
import MeetingDetails from './MeetingDetails';
import SessionDetails from '../sessions/SessionDetails';


function SessionMeetings() {
	const sessionId = useSelector(selectCurrentSessionId);

	return (
		<>
			<TopRow>
				<GroupPathSelector/>
				<CurrentSessionSelector />
			</TopRow>

			<MeetingCalendar />
			<SplitPanel dataSet='telecons' >
				<Panel>
					<MeetingCalendar />
				</Panel>
				<Panel>
					<Tabs>
						<TabList>
							<Tab>Session</Tab>
							<Tab>Meetings</Tab>
						</TabList>
						<TabPanel>
							<SessionDetails key={sessionId} />
						</TabPanel>
						<TabPanel>
							<MeetingDetails />
						</TabPanel>
					</Tabs>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default SessionMeetings;
