import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Form, Row, Field} from 'dot11-components/form';

import {
	selectCurrentGroupDefaults,
	setCurrentGroupDefaults
} from '../store/current';
import {selectGroupName} from '../store/groups';

import CalendarAccountSelector from '../components/CalendarAccountSelector';
import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TimeZoneSelector from '../components/TimeZoneSelector';


function TeleconDefaults() {
	const dispatch = useDispatch();
	const defaults = useSelector(selectCurrentGroupDefaults);
	const groupName = useSelector(selectGroupName);
	const changeEntry = (changes) => dispatch(setCurrentGroupDefaults(changes));

	return (
		<Form
			title={`Defaults for ${groupName}`}
			style={{minWidth: 400}}
		>
			<Row>
				<Field label='Timezone:'>
					<TimeZoneSelector
						value={defaults.timezone}
						onChange={timezone => changeEntry({timezone})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Calendar:'>
					<CalendarAccountSelector
						value={defaults.calendarAccountId}
						onChange={calendarAccountId => changeEntry({calendarAccountId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Webex account:'>
					<WebexAccountSelector
						value={defaults.webexAccountId}
						onChange={webexAccountId => changeEntry({webexAccountId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Template'>
					<WebexTemplateSelector
						value={defaults.webexTemplateId}
						onChange={webexTemplateId => changeEntry({webexTemplateId})}
						accountId={defaults.webexAccountId}
					/>
				</Field>
			</Row>
		</Form>
	)
}

export default TeleconDefaults;
