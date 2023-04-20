import React from 'react';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { Form, Field, Checkbox, EntityId, Dictionary } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import { User, selectUser } from '../store/user';
import { selectSyncedMeetingEntities, selectMeetingIds, SyncedMeeting } from '../store/meetings';
import { Officer, selectOfficersState } from '../store/officers';
import { Member, selectMember } from '../store/members';
import { selectGroupsState } from '../store/groups';
import { WebexMeeting, displayMeetingNumber } from '../store/webexMeetings';
import { sendEmail } from '../store/emailActions';
import { RootState } from '../store';

function displayDateTime(entity: WebexMeeting, timezone: string) {
	const start = DateTime.fromISO(entity.start, {zone: timezone});
	const end = DateTime.fromISO(entity.end, {zone: timezone});
	return start.toFormat('EEE, d LLL yyyy HH:mm') + '-' + end.toFormat('HH:mm');
}

function genTable(meetings: SyncedMeeting[]) {

	const td = (d: string) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th('When')}
			${th('Title')}
			${th('Meeting')}
			${th('Host key')}
		</tr>`;
	const row = (webexAccountName: string, webexMeeting: WebexMeeting, timezone: string) => `
		<tr>
			${td(displayDateTime(webexMeeting, timezone))}
			${td(webexMeeting.title)}
			${td(`${webexAccountName}: <a href="${webexMeeting.webLink}">${displayMeetingNumber(webexMeeting.meetingNumber)}</a>`)}
			${td(webexMeeting.hostKey)}
		</tr>`;
	const table = `
		<table role="presentation" cellspacing="0" cellpadding="5px" border="1">
			${header}
			${meetings.map(m => row(m.webexAccountName, m.webexMeeting!, m.timezone)).join('')}
		</table>`;

	return table;
}


function genEmailBody(user: User, officers: Member[], tableHtml: string) {
	const sender = user.Name;
	const names = officers.map(o => o.Name).join(', ');

	return `\
Hello ${names}<br>\
<br>\
Here are the host keys for your upcomming teleconferences:<br>\
<br>\
${tableHtml}\n\
<br>\
Regards,<br>\
${sender}<br>\
`;
}

const genEmailAddress = (m: Member | User) => `${m.Name} <${m.Email}>`;

const genEmailToList = (officers: Member[]) => officers.map(genEmailAddress);

function selectOfficers(state: RootState, groupId: EntityId) {
	const {ids, entities} = selectOfficersState(state);
	const validPositions = ['Chair', 'Vice chair', 'Secretary'];

	function officerCompare(o1: Officer, o2: Officer) {
		const n1 = validPositions.indexOf(o1.position);
		const n2 = validPositions.indexOf(o2.position);
		return n1 - n2;
	}

	const officers = ids
		.map(id => entities[id]!)
		.filter(o => o.group_id === groupId && validPositions.indexOf(o.position) >= 0)
		.sort(officerCompare)
		.map(o => selectMember(state, o.sapin))
		.filter(o => !!o) as Member[];

	return officers;
}

function selectGroups(state: RootState) {
	const {entities: groupEntities} = selectGroupsState(state);
	const meetingEntities = selectSyncedMeetingEntities(state);
	const meetingIds = selectMeetingIds(state);

	const groupIds = new Set<EntityId>();
	for (const id of meetingIds) {
		const m = meetingEntities[id]!;
		if (DateTime.fromISO(m.start) >= DateTime.now() && m.webexMeetingId && m.organizationId)
			groupIds.add(m.organizationId);
	}
	return [...groupIds]
		.map(id => groupEntities[id]!)
		.sort((a, b) => a.name.localeCompare(b.name));
}

function selectEmails(state: RootState, groupIds: EntityId[]) {
	const {entities: groupEntities} = selectGroupsState(state);
	const meetingEntities = selectSyncedMeetingEntities(state);
	const meetingIds = selectMeetingIds(state);
	const user = selectUser(state)!;

	const emails: Dictionary<any> = {};
	for (const id of groupIds) {
		const group = groupEntities[id]!;

		const meetings = meetingIds
			.map(id => meetingEntities[id]!)
			.filter(m => m.organizationId === id && DateTime.fromISO(m.start) >= DateTime.now() && m.webexMeetingId);
		const tableHtml = genTable(meetings);

		const officers = selectOfficers(state, id);
		console.log(id, officers)

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
						Data: genEmailBody(user, officers, tableHtml),
					},
					Text: {
						Charset: "UTF-8",
						Data: genEmailBody(user, officers, tableHtml)
							.replace('<br>', '\n')
							.replace(/<[^>]*>/g, ''),
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

function MeetingEmail({
	close
}: {
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const groups = useAppSelector(selectGroups);
	const nRows = Math.round(groups.length / 3) + 1;
	const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
	const emails = useAppSelector(state => selectEmails(state, selectedGroups));
	const [busy, setBusy] = React.useState(false);

	const handleSelectGroup: React.ChangeEventHandler<HTMLInputElement> = (e) => {
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
			style={{minWidth: '600px', maxHeight: '80vh', overflow: 'auto'}}
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

export default MeetingEmail;
