import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Form, Row, Field} from 'dot11-components/form';
import {selectTeleconDefaults, setTeleconDefaults} from '../store/telecons';

import CalendarAccountSelector from '../components/CalendarAccountSelector';
import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TimeZoneSelector from '../components/TimeZoneSelector';


function TeleconDefaults({
	groupName,
}) {
	const dispatch = useDispatch();
	const defaults = useSelector(selectTeleconDefaults);
	const changeEntry = (changes) => {
		const newDefaults = {...defaults, ...changes};
		dispatch(setTeleconDefaults(newDefaults));
	}
	return (
		<Form
			title={`Defaults for ${groupName}`}
		>
			<Row>
				<Field label='Timezone:'>
					<TimeZoneSelector
						style={{width: 200}}
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
						value={defaults.webex_template_id}
						onChange={webex_template_id => changeEntry({webex_template_id})}
						accountId={defaults.webexAccountId}
					/>
				</Field>
			</Row>
		</Form>
	)
}

export default TeleconDefaults;
