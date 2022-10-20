import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import {Form, Field, Checkbox} from 'dot11-components/form';

import {selectUser} from '../store/user';
import {selectTeleconsState, selectSyncedTeleconEntities, selectTeleconIds} from '../store/telecons';
import {selectOfficersState} from '../store/officers';
import {selectMember} from '../store/members';
import {selectGroupsState} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';
import {sendEmail} from '../store/emailActions';

function displayDateTime(entity, timezone) {
	const start = DateTime.fromISO(entity.start, {zone: timezone});
	const end = DateTime.fromISO(entity.end, {zone: timezone});
	return start.toFormat('EEE, d LLL yyyy HH:mm') + '-' + end.toFormat('HH:mm');
}

function genTable(telecons) {

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('When')}
			${th('Title')}
			${th('Meeting')}
			${th('Host key')}
		</tr>`;
	const row = (m, timezone) => `
		<tr>
			${td(displayDateTime(m, timezone))}
			${td(m.title)}
			${td(`${m.webexAccountName}: <a href="${m.webLink}">${displayMeetingNumber(m.meetingNumber)}</a>`)}
			${td(m.hostKey)}
		</tr>`;
	const table = `
		<table role="presentation" cellspacing="0" cellpadding="5px" border="1">
			${header}
			${telecons.map(t => row(t.webexMeeting, t.timezone)).join('')}
		</table>`;

	return table;
}


function genEmailBody(user, officers, table) {
	const sender = user.Name;
	const names = officers.map(o => o.Name).join(', ');

	return `\
Hello ${names}<br>\
<br>\
Here are the host keys for your upcomming teleconferences:<br>\
<br>\
${table}\n\
<br>\
Regards,<br>\
${sender}<br>\
`;
}

const genEmailAddress = (m) => `${m.Name} <${m.Email}>`;

const genEmailToList = (officers) => officers.map(genEmailAddress);

function selectOfficers(state, groupId) {
	const {ids, entities} = selectOfficersState(state);
	const validPositions = ['Chair', 'Vice chair', 'Secretary'];
	function officerCompare(o1, o2) {
		const n1 = validPositions.indexOf(o1.position);
		const n2 = validPositions.indexOf(o2.position);
		return n1 - n2;
	}
	const officers = ids
		.map(id => entities[id])
		.filter(o => o.group_id === groupId && validPositions.indexOf(o.position) >= 0)
		.sort(officerCompare)
		.map(o => selectMember(state, o.sapin));
	return officers;
}

function selectGroups(state) {
	const {ids, entities} = selectTeleconsState(state);
	const {entities: groupEntities} = selectGroupsState(state);

	const groupIds = new Set();
	for (const id of ids) {
		const t = entities[id];
		if (t.organizationId === id && DateTime.fromISO(t.start) >= DateTime.now() && t.webexMeetingId)
			groupIds.add(t.organizationId);
	}
	return [...groupIds]
		.map(id => groupEntities[id])
		.sort((a, b) => a.name.localeCompare(b.name));
}

function selectEmails(state, groupIds) {
	const {entities: groupEntities} = selectGroupsState(state);
	const teleconEntities = selectSyncedTeleconEntities(state);
	const teleconIds = selectTeleconIds(state);
	const user = selectUser(state);

	const emails = {};
	for (const id of groupIds) {
		const group = groupEntities[id];

		const telecons = teleconIds
			.map(id => teleconEntities[id])
			.filter(t => t.organizationId === id && DateTime.fromISO(t.start) >= DateTime.now() && t.webexMeetingId);
		const table = genTable(telecons);

		const officers = selectOfficers(state, id);

		const email = {
			Destination: {
				/* required */
				CcAddresses: [genEmailAddress(user)],
				ToAddresses: genEmailToList(officers),
			},
			Message: {
				Subject: {
					Charset: "UTF-8",
					Data: `${group.name} host keys`,
				},
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: genEmailBody(user, officers, table),
					},
					Text: {
						Charset: "UTF-8",
						Data: "TEXT_FORMAT_BODY",
					},
				}
			},
			ReplyToAddresses: [genEmailAddress(user)]
		}

		emails[group.name] = email;
	}

	return emails;
}


const Grid = styled.div`
	display: grid;
	grid-gap: 1em;
	grid-auto-flow: column;
	grid-auto-columns: max-content;
	max-width: 500px;
`;

function TeleconEmail({close}) {
	const dispatch = useDispatch();
	const groups = useSelector(selectGroups);
	const nRows = Math.round(groups.length / 3) + 1;
	const [selectedGroups, setSelectedGroups] = React.useState([]);
	const emails = useSelector(state => selectEmails(state, selectedGroups));
	const [busy, setBusy] = React.useState(false);

	function handleSelectGroup(e) {
		let selected = selectedGroups;
		if (!e.target.checked)
			selected = selected.filter(id => id !== e.target.value);
		else
			selected = [...selected, e.target.value];
		setSelectedGroups(selected);
	}

	async function send() {
		setBusy(true);
		await Promise.all(Object.values(emails).map(email => {
			return dispatch(sendEmail(email));
		}));
		setBusy(false);
		close();
	}

	return (
		<Form 
			title='Send eMail'
			busy={busy}
			submit={send}
			submitLabel='Send'
			cancel={close}
			cancelLabel='Cancel'
			style={{minWidth: '600px'}}
		>
			<Grid style={{gridTemplateRows: `repeat(${nRows}, 1fr)`}}>
				{groups.map(g => <Field key={g.id} label={g.name}><Checkbox value={g.id} onChange={handleSelectGroup} checked={selectedGroups.includes(g.id)} /></Field>)}
			</Grid>
			<Tabs>
				<TabList>
					{Object.keys(emails).map(key => <Tab key={key}>{key}</Tab>)}
				</TabList>
				{Object.entries(emails).map(([key, email]) => 
					<TabPanel key={key}>
						<div dangerouslySetInnerHTML={{__html: email.Message.Body.Html.Data}} />
					</TabPanel>
				)}
			</Tabs>
		</Form>
	)
}

export default TeleconEmail;
