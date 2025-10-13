import * as React from "react";
import { DateTime } from "luxon";
import { EntityId, Dictionary, createSelector } from "@reduxjs/toolkit";
import { useParams } from "react-router";

import {
	Form,
	Spinner,
	Tab,
	Tabs,
	DropdownButton,
	Row,
	Col,
	Container,
} from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, type User } from "@/store/user";
import {
	selectSyncedMeetingEntities,
	selectMeetingIds,
	type SyncedMeeting,
} from "@/store/meetings";
import { selectOfficersState, type Officer } from "@/store/officers";
import { selectMemberEntities, type UserMember } from "@/store/members";
import { selectGroupEntities } from "@/store/groups";
import { WebexMeeting, displayMeetingNumber } from "@/store/webexMeetings";
import { sendEmails, type Email } from "@/store/emailActions";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

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

function selectOfficers(
	ids: EntityId[],
	entities: Dictionary<Officer>,
	memberEntities: Dictionary<UserMember>,
	groupId: EntityId
) {
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
		.map((o) => memberEntities[o.sapin])
		.filter(Boolean) as UserMember[];

	return officers;
}

const selectMeetingsGroupIds = createSelector(
	selectMeetingIds,
	selectSyncedMeetingEntities,
	(meetingIds, meetingEntities) => {
		const groupIds = new Set<EntityId>();
		for (const id of meetingIds) {
			const m = meetingEntities[id]!;
			if (
				DateTime.fromISO(m.end) >= DateTime.now() &&
				m.webexMeetingId &&
				m.organizationId
			)
				groupIds.add(m.organizationId);
		}

		return Array.from(groupIds);
	}
);

function useGroupEmails(groupIds: EntityId[]) {
	const groupEntities = useAppSelector(selectGroupEntities);
	const meetingIds = useAppSelector(selectMeetingIds);
	const meetingEntities = useAppSelector(selectSyncedMeetingEntities);
	const user = useAppSelector(selectUser);
	const { ids, entities } = useAppSelector(selectOfficersState);
	const memberEntities = useAppSelector(selectMemberEntities);

	return React.useMemo(() => {
		const emailEntities: Dictionary<Email> = {};
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

			const officers = selectOfficers(ids, entities, memberEntities, id);

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

			emailEntities[id] = email;
		}

		return emailEntities;
	}, [groupIds, groupEntities, meetingIds, meetingEntities, user]);
}

function MeetingsEmail({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const groupEntities = useAppSelector(selectGroupEntities);
	const groupIds = useAppSelector(selectMeetingsGroupIds);
	const [selectedGroupIds, setSelectedGroupIds] = React.useState<EntityId[]>(
		[]
	);
	const emailEntities = useGroupEmails(groupIds);
	const [busy, setBusy] = React.useState(false);

	function handleSelectGroup(e: React.ChangeEvent<HTMLInputElement>) {
		let selected = selectedGroupIds;
		if (!e.target.checked)
			selected = selected.filter((id) => id !== e.target.value);
		else selected = [...selected, e.target.value];
		setSelectedGroupIds(selected);
	}

	async function send(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		const emails = selectedGroupIds.map((id) => emailEntities[id]!);
		await dispatch(sendEmails(groupName!, emails));
		setBusy(false);
		close();
	}

	function tabTitle(id: EntityId) {
		return (
			<div key={id} style={{ display: "flex", alignItems: "center" }}>
				<Form.Check
					value={id}
					onChange={handleSelectGroup}
					checked={selectedGroupIds.includes(id)}
					label={groupEntities[id]?.name}
				/>
			</div>
		);
	}

	return (
		<Form
			onSubmit={send}
			style={{ minWidth: "900px", maxHeight: "80vh", overflow: "auto" }}
			className={styles["meetings-email"] + " p-3"}
		>
			<Row className="mb-3">
				<Col>
					<h3 className="title">
						Select subgroups to receive host keys
					</h3>
				</Col>
				<Col xs="auto">
					<Spinner size="sm" hidden={!busy} />
				</Col>
			</Row>
			<Tabs defaultActiveKey={groupIds[0]}>
				{groupIds.map((groupId) => {
					const email = emailEntities[groupId];
					const __html =
						email?.Message.Body.Html?.Data ||
						`Error: Email for ${groupId} missing`;
					return (
						<Tab
							key={groupId}
							eventKey={groupId}
							title={tabTitle(groupId)}
						>
							<Container
								className="mt-3 mb-3"
								dangerouslySetInnerHTML={{
									__html,
								}}
							/>
						</Tab>
					);
				})}
			</Tabs>
			<SubmitCancelRow
				submitLabel="Send"
				cancel={close}
				disabled={selectedGroupIds.length === 0}
			/>
		</Form>
	);
}

export function EmailMeetingHostKeys({ disabled }: { disabled?: boolean }) {
	const [showEmail, setShowEmail] = React.useState(false);

	return (
		<DropdownButton
			variant="light"
			title="Email host keys"
			show={showEmail}
			onToggle={() => setShowEmail(!showEmail)}
			disabled={disabled}
		>
			<MeetingsEmail close={() => setShowEmail(false)} />
		</DropdownButton>
	);
}
