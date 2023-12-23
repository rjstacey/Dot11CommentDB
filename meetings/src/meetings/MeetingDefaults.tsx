import * as React from "react";
import { useParams } from 'react-router-dom';

import { Form, Row, Field } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	selectGroupDefaults,
	updateGroupDefaults,
	GroupDefaults,
} from '../store/current';

import CalendarAccountSelector from '../components/CalendarAccountSelector';
import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TimeZoneSelector from '../components/TimeZoneSelector';


function TeleconDefaults() {
	const dispatch = useAppDispatch();
	const groupName = useParams().groupName || "";
	const selectCurrentGroupDefaults = React.useCallback((state: any) => selectGroupDefaults(state, groupName), [groupName]);
	const defaults = useAppSelector(selectCurrentGroupDefaults);
	const changeEntry = (changes: Partial<GroupDefaults>) => dispatch(updateGroupDefaults({groupName, changes}));

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
