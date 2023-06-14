import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Form, Row, Field } from 'dot11-components';

import {
	selectCurrentGroupDefaults,
	setCurrentGroupDefaults,
	GroupDefaults
} from '../store/current';

import { selectWorkingGroup } from '../store/groups';

import CalendarAccountSelector from '../components/CalendarAccountSelector';
import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TimeZoneSelector from '../components/TimeZoneSelector';


function TeleconDefaults() {
	const dispatch = useAppDispatch();
	const defaults = useAppSelector(selectCurrentGroupDefaults);
	const groupName = useAppSelector(selectWorkingGroup)?.name;
	const changeEntry = (changes: Partial<GroupDefaults>) => dispatch(setCurrentGroupDefaults(changes));

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
