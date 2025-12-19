import React from "react";
import { DateTime } from "luxon";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, type User } from "@/store";
import {
	selectSyncedMeetingEntities,
	selectMeetingIds,
	type SyncedMeeting,
} from "@/store/meetings";
import { selectOfficersState, type Officer } from "@/store/officers";
import { selectMemberEntities, type UserMember } from "@/store/members";
import { selectGroupEntities, selectTopLevelGroupName } from "@/store/groups";
import { displayMeetingNumber, type WebexMeeting } from "@/store/webexMeetings";
import { sendEmails, type Email } from "@/store/emailActions";

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

function genEmailBody(
	user: User,
	officers: UserMember[],
	meetings: SyncedMeeting[]
) {
	const sender = user.Name;
	const names = officers.map((o) => o.Name).join(", ");
	const tableHtml = genTable(meetings);

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

function useGetGroupOfficers() {
	const { ids, entities } = useAppSelector(selectOfficersState);
	const memberEntities = useAppSelector(selectMemberEntities);
	const validPositions = ["Chair", "Vice chair", "Secretary"];

	function officerCompare(o1: Officer, o2: Officer) {
		const n1 = validPositions.indexOf(o1.position);
		const n2 = validPositions.indexOf(o2.position);
		return n1 - n2;
	}

	const getGroupOfficers = React.useCallback(
		(groupId: string) => {
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
		},
		[ids, entities, memberEntities]
	);

	return getGroupOfficers;
}

export function useEmailHostKey() {
	const dispatch = useAppDispatch();
	const groupName = useAppSelector(selectTopLevelGroupName);
	const groupEntities = useAppSelector(selectGroupEntities);
	const meetingIds = useAppSelector(selectMeetingIds);
	const meetingEntities = useAppSelector(selectSyncedMeetingEntities);
	const user = useAppSelector(selectUser);
	const getGroupOfficers = useGetGroupOfficers();

	const groupIds = React.useMemo(() => {
		const groupIds = new Set<string>();
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
	}, [meetingIds, meetingEntities]);

	const getGroupMeetings = React.useCallback(
		(groupId: string) => {
			return meetingIds
				.map((id) => meetingEntities[id]!)
				.filter(
					(m) =>
						m.organizationId === groupId &&
						DateTime.fromISO(m.start) >= DateTime.now() &&
						m.webexMeetingId
				);
		},
		[meetingIds, meetingEntities]
	);

	const getGroupLabel = React.useCallback(
		(groupId: string) => {
			const group = groupEntities[groupId];
			if (!group) throw new Error("No group for groupId=" + groupId);
			return group.name;
		},
		[groupEntities]
	);

	const getGroupEmail = React.useCallback(
		(groupId: string) => {
			const officers = getGroupOfficers(groupId);
			const meetings = getGroupMeetings(groupId);

			const subject = getGroupLabel(groupId) + " host keys";

			const bodyHtml = genEmailBody(user, officers, meetings);
			const bodyText = bodyHtml
				.replace("<br>", "\n")
				.replace(/<[^>]*>/g, "");

			const ToAddresses = genEmailToList(officers);
			const CcAddresses = [genEmailAddress(user)];
			const ReplyToAddresses = [genEmailAddress(user)];

			const Charset = "UTF-8";
			const email: Email = {
				Destination: { ToAddresses, CcAddresses },
				Message: {
					Subject: { Charset, Data: subject },
					Body: {
						Html: { Charset, Data: bodyHtml },
						Text: { Charset, Data: bodyText },
					},
				},
				ReplyToAddresses,
			};

			return email;
		},
		[user, getGroupOfficers, getGroupMeetings, getGroupLabel]
	);

	const getGroupEmailBody = React.useCallback(
		(groupId: string) => {
			const email = getGroupEmail(groupId);
			if (!email) throw new Error("No email for groupId=" + groupId);
			return email.Message.Body.Html!.Data;
		},
		[getGroupEmail]
	);

	const sendGroupEmails = React.useCallback(
		async (groupIds: string[]) => {
			const emails = groupIds.map(getGroupEmail);
			await dispatch(sendEmails(groupName, emails));
		},
		[groupName, dispatch, getGroupEmail]
	);

	return {
		groupIds,
		getGroupEmailBody,
		getGroupLabel,
		sendGroupEmails,
	};
}
