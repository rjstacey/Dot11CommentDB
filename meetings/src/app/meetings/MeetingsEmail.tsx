import * as React from "react";
import { DateTime } from "luxon";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { EntityId, Dictionary } from "@reduxjs/toolkit";
import { useParams } from "react-router";

import { Form, Checkbox } from "dot11-components";

import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, type User } from "@/store/user";
import {
	selectSyncedMeetingEntities,
	selectMeetingIds,
	type SyncedMeeting,
} from "@/store/meetings";
import { selectOfficersState, type Officer } from "@/store/officers";
import { selectMember, type UserMember } from "@/store/members";
import { selectGroupsState, selectGroups } from "@/store/groups";
import { WebexMeeting, displayMeetingNumber } from "@/store/webexMeetings";
import { sendEmails, type Email } from "@/store/emailActions";

import styles from "./meetings.module.css";

function displayDateTime(entity: WebexMeeting, timezone: string) {
	const start = DateTime.fromISO(entity.start, { zone: timezone });
	const end = DateTime.fromISO(entity.end, { zone: timezone });
	return (
		start.toFormat("EEE, d LLL yyyy HH:mm") + "-" + end.toFormat("HH:mm")
	);
}

function genTable(meetings: SyncedMeeting[]) {
	const td = (d: string) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th("When")}
			${th("Title")}
			${th("Meeting")}
			${th("Host key")}
		</tr>`;
	const row = (
		webexAccountName: string,
		webexMeeting: WebexMeeting,
		timezone: string
	) => `
		<tr>
			${td(displayDateTime(webexMeeting, timezone))}
			${td(webexMeeting.title)}
			${td(
				`${webexAccountName}: <a href="${
					webexMeeting.webLink
				}">${displayMeetingNumber(webexMeeting.meetingNumber)}</a>`
			)}
			${td(webexMeeting.hostKey)}
		</tr>`;
	const table = `
		<table role="presentation" cellspacing="0" cellpadding="5px" border="1">
			${header}
			${meetings
				.map((m) =>
					m.webexMeeting
						? row(m.webexAccountName, m.webexMeeting, m.timezone)
						: "<tr><td colspan='4'>Error</td></tr>"
				)
				.join("")}
		</table>`;

	return table;
}

function genEmailBody(user: User, officers: UserMember[], tableHtml: string) {
	const sender = user.Name;
	const names = officers.map((o) => o.Name).join(", ");

	return `\
Hello ${names}<br>\
<br>\
Here are the host keys for your upcoming teleconferences:<br>\
<br>\
${tableHtml}\n\
<br>\
Regards,<br>\
${sender}<br>\
`;
}

const genEmailAddress = (m: UserMember | User) => `${m.Name} <${m.Email}>`;

const genEmailToList = (officers: UserMember[]) =>
	officers.map(genEmailAddress);

function selectOfficers(state: RootState, groupId: EntityId) {
	const { ids, entities } = selectOfficersState(state);
	const validPositions = ["Chair", "Vice chair", "Secretary"];

	function officerCompare(o1: Officer, o2: Officer) {
		const n1 = validPositions.indexOf(o1.position);
		const n2 = validPositions.indexOf(o2.position);
		return n1 - n2;
	}

	const officers = ids
		.map((id) => entities[id]!)
		.filter(
			(o) =>
				o.group_id === groupId &&
				validPositions.indexOf(o.position) >= 0
		)
		.sort(officerCompare)
		.map((o) => selectMember(state, o.sapin))
		.filter((o) => !!o) as UserMember[];

	return officers;
}

function selectMeetingsGroups(state: RootState) {
	let groups = selectGroups(state);
	const meetingEntities = selectSyncedMeetingEntities(state);
	const meetingIds = selectMeetingIds(state);

	const groupIds = new Set<EntityId>();
	for (const id of meetingIds) {
		const m = meetingEntities[id]!;
		if (
			DateTime.fromISO(m.start) >= DateTime.now() &&
			m.webexMeetingId &&
			m.organizationId
		)
			groupIds.add(m.organizationId);
	}

	return groups.filter((g) => groupIds.has(g.id));
}

function selectEmails(state: RootState, groupIds: EntityId[]) {
	const { entities: groupEntities } = selectGroupsState(state);
	const meetingEntities = selectSyncedMeetingEntities(state);
	const meetingIds = selectMeetingIds(state);
	const user = selectUser(state)!;

	const emails: Dictionary<any> = {};
	for (const id of groupIds) {
		const group = groupEntities[id]!;

		const meetings = meetingIds
			.map((id) => meetingEntities[id]!)
			.filter(
				(m) =>
					m.organizationId === id &&
					DateTime.fromISO(m.start) >= DateTime.now() &&
					m.webexMeetingId
			);
		const tableHtml = genTable(meetings);

		const officers = selectOfficers(state, id);

		const email: Email = {
			Destination: {
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
							.replace("<br>", "\n")
							.replace(/<[^>]*>/g, ""),
					},
				},
			},
			ReplyToAddresses: [genEmailAddress(user)],
		};

		emails[group.name] = email;
	}

	return emails;
}

function MeetingEmail({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const groups = useAppSelector(selectMeetingsGroups);
	const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
	const emails = useAppSelector((state) =>
		selectEmails(state, selectedGroups)
	);
	const [busy, setBusy] = React.useState(false);

	const handleSelectGroup: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		let selected = selectedGroups;
		if (!e.target.checked)
			selected = selected.filter((id) => id !== e.target.value);
		else selected = [...selected, e.target.value];
		setSelectedGroups(selected);
	};

	async function send() {
		setBusy(true);
		await dispatch(sendEmails(groupName!, Object.values(emails)));
		setBusy(false);
		close();
	}

	return (
		<Form
			title="Email host keys"
			busy={busy}
			submit={send}
			submitLabel="Send"
			cancel={close}
			cancelLabel="Cancel"
			style={{ minWidth: "600px", maxHeight: "80vh", overflow: "auto" }}
		>
			<div
				className={styles["meetings-email-grid"]}
				//style={{ gridTemplateRows: `repeat(${nRows}, 1fr)` }}
			>
				{groups.map((g) => (
					<div
						key={g.id}
						style={{ display: "flex", alignItems: "center" }}
					>
						<Checkbox
							value={g.id}
							onChange={handleSelectGroup}
							checked={selectedGroups.includes(g.id)}
						/>
						<label>{g.name}</label>
					</div>
				))}
			</div>
			<Tabs>
				<TabList>
					{Object.keys(emails).map((key) => (
						<Tab key={key}>{key}</Tab>
					))}
				</TabList>
				{Object.entries(emails).map(([key, email]) => (
					<TabPanel key={key}>
						<div
							dangerouslySetInnerHTML={{
								__html: email.Message.Body.Html.Data,
							}}
						/>
					</TabPanel>
				))}
			</Tabs>
		</Form>
	);
}

export default MeetingEmail;
