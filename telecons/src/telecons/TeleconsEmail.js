import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import {Form, Field, Checkbox} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {selectUser} from '../store/user';
import {selectTeleconsState, selectSyncedTeleconEntities, selectTeleconIds} from '../store/telecons';
import {selectOfficersState} from '../store/officers';
import {selectMemberName} from '../store/members';
import {selectGroupsState} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';
import {sendEmail} from '../store/emailActions';

function displayDateTime(entity) {
	const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
	const end = DateTime.fromISO(entity.end, {zone: entity.timezone});
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
	const row = m => `
		<tr>
			${td(displayDateTime(m))}
			${td(m.title)}
			${td(`${m.webexAccountName}: <a href="${m.webLink}">${displayMeetingNumber(m.meetingNumber)}</a>`)}
			${td(m.hostKey)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid gray;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${telecons.map(t => row(t.webexMeeting)).join('')}
		</table>`;

	return table;
}

function selectOfficerNames(state, groupId) {
	const {ids, entities} = selectOfficersState(state);
	const validPosition = new RegExp('Chair|Vice chair|Secretary', 'i');
	const names = ids
		.map(id => entities[id])
		.filter(o => o.group_id === groupId && validPosition.test(o.position))
		.map(o => selectMemberName(state, o.sapin))
		.join(', ');
	return names;
}

function generateEmail(user, group, names, table) {
	const sender = user.Name;

	const template = `\
Hello ${names}<br>\
<br>\
Here are the host keys for your upcomming teleconferences:<br>\
<br>\
${table}\n\
<br>\
Regards,<br>\
${sender}<br>\
`;

	return template;
}

function selectEmails(state, groupIds) {
	const {entities: groupEntities} = selectGroupsState(state);
	const teleconEntities = selectSyncedTeleconEntities(state);
	const teleconIds = selectTeleconIds(state);
	const {ids: officerIds, entities: officerEntities} = selectOfficersState(state);
	const user = selectUser(state);

	const emails = {};
	for (const id of groupIds) {
		const group = groupEntities[id];

		const telecons = teleconIds.map(id => teleconEntities[id]).filter(t => t.organizationId === id);
		const table = genTable(telecons);

		const names = selectOfficerNames(state, id);

		const email = {
			Destination: {
				/* required */
				CcAddresses: [],
			ToAddresses: [
				"rjstacey@gmail.com", //RECEIVER_ADDRESS
					/* more To-email addresses */
				],
			},
			Message: {
				Subject: {
					Charset: "UTF-8",
					Data: `${group.name} host keys`,
				},
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: generateEmail(user, group, names, table),
					},
					Text: {
						Charset: "UTF-8",
						Data: "TEXT_FORMAT_BODY",
					},
				}
			}
		}

		emails[group.name] = email;
	}

	return emails;
}

function SendEmailModal({isOpen, close, groupIds}) {
	const dispatch = useDispatch();
	const emails = useSelector(state => selectEmails(state, groupIds));

	async function send() {
		await Promise.all(Object.values(emails).map(email => {
			return dispatch(sendEmail(email));
		}));
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form 
				title='Send eMail'
				submit={send}
				submitLabel='Send'
				cancel={close}
				cancelLabel='Cancel'
			>
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
		</AppModal>
	);
}

function selectGroups(state) {
	const {ids, entities} = selectTeleconsState(state);
	const {entities: groupEntities} = selectGroupsState(state);

	const groupIds = new Set();
	for (const id of ids)
		groupIds.add(entities[id].organizationId);
	return [...groupIds].map(id => groupEntities[id]).sort((a, b) => a.name.localeCompare(b.name));
}

const Grid = styled.div`
	display: grid;
	grid-gap: 1em;
	grid-auto-flow: column;
	grid-auto-columns: max-content;
	max-width: 500px;
`;

function TeleconEmail() {
	const groups = useSelector(selectGroups);
	const nRows = Math.round(groups.length / 3) + 1;
	const [selectedGroups, setSelectedGroups] = React.useState([]);
	const [doSend, setDoSend] = React.useState(false);

	function handleSelectGroup(e) {
		let selected = selectedGroups;
		if (!e.target.checked)
			selected = selected.filter(id => id !== e.target.value);
		else
			selected = [...selected, e.target.value];
		setSelectedGroups(selected);
	}

	function submit() {
		console.log(selectedGroups)
		setDoSend(true)
	}

	return (
		<Form
			submit={submit}
			submitLabel='Send'
		>
			<Grid style={{gridTemplateRows: `repeat(${nRows}, 1fr)`}}>
				{groups.map(g => <Field key={g.id} label={g.name}><Checkbox value={g.id} onChange={handleSelectGroup} checked={selectedGroups.includes(g.id)} /></Field>)}
			</Grid>
			<SendEmailModal
				isOpen={doSend}
				close={() => setDoSend(false)}
				groupIds={selectedGroups}
			/>
		</Form>
	)
}

export default TeleconEmail;
