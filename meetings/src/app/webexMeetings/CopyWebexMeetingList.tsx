import { EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import {
	displayMeetingNumber,
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";

function displayDateTime(entity: SyncedWebexMeeting) {
	const start = DateTime.fromISO(entity.start, { zone: entity.timezone });
	const end = DateTime.fromISO(entity.end, { zone: entity.timezone });
	return (
		start.toFormat("EEE, d LLL yyyy HH:mm") + "-" + end.toFormat("HH:mm")
	);
}

function copyWebexMeetingList(
	selected: EntityId[],
	webexMeetingEntities: Record<EntityId, SyncedWebexMeeting>
) {
	const td = (d: string) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th("When")}
			${th("Title")}
			${th("WebEx meeting")}
			${th("Host key")}
		</tr>`;
	const row = (w: SyncedWebexMeeting) => `
		<tr>
			${td(displayDateTime(w))}
			${td(w.title)}
			${td(
				`${w.accountName}: <a href="${
					w.webLink
				}">${displayMeetingNumber(w.meetingNumber)}</a>`
			)}
			${td(w.hostKey)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid gray;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map((id) => row(webexMeetingEntities[id]!)).join("")}
		</table>`;

	const type = "text/html";
	const blob = new Blob([table], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function CopyWebexMeetingListButton() {
	const { selected } = useAppSelector(selectWebexMeetingsState);
	const entities = useAppSelector(selectSyncedWebexMeetingEntities);

	return (
		<Button
			variant="outline-primary"
			className="bi-copy"
			title="Copy meeting list"
			onClick={() => copyWebexMeetingList(selected, entities)}
			disabled={selected.length === 0}
		/>
	);
}

export default CopyWebexMeetingListButton;
