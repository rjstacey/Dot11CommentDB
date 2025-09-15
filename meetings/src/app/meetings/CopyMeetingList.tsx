import { EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import {
	selectMeetingsState,
	selectSyncedMeetingEntities,
	SyncedMeeting,
} from "@/store/meetings";
import {
	displayMeetingNumber,
	selectSyncedWebexMeetingEntities,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";

function displayDateTime(entity: SyncedMeeting) {
	const start = DateTime.fromISO(entity.start, { zone: entity.timezone });
	const end = DateTime.fromISO(entity.end, { zone: entity.timezone });
	return (
		start.toFormat("EEE, d LLL yyyy HH:mm") + "-" + end.toFormat("HH:mm")
	);
}

function copyMeetingList(
	selected: EntityId[],
	meetingEntities: Record<EntityId, SyncedMeeting>,
	webexMeetingEntities: Record<EntityId, SyncedWebexMeeting>
) {
	const td = (d: string) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th("When")}
			${th("Title")}
			${th("Room")}
			${th("WebEx meeting")}
			${th("Host key")}
		</tr>`;
	const row = (m: SyncedMeeting) => {
		const w = m.webexMeetingId
			? webexMeetingEntities[m.webexMeetingId]
			: undefined;
		return `
                <tr>
                    ${td(displayDateTime(m))}
                    ${td(m.summary)}
                    ${td(m.roomName || "-")}
                    ${td(
						w
							? `${w.accountName}: <a href="${
									w.webLink
							  }">${displayMeetingNumber(w.meetingNumber)}</a>`
							: "(None)"
					)}
                    ${td(w ? w.hostKey : "(None)")}
                </tr>`;
	};
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid gray;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map((id) => row(meetingEntities[id]!)).join("")}
		</table>`;

	const type = "text/html";
	const blob = new Blob([table], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function CopyMeetingListButton({ disabled }: { disabled?: boolean }) {
	const { selected } = useAppSelector(selectMeetingsState);
	const wmEntities = useAppSelector(selectSyncedWebexMeetingEntities);
	const meetingEntities = useAppSelector(selectSyncedMeetingEntities);

	return (
		<Button
			variant="outline-primary"
			className="bi-copy"
			title="Copy meeting list"
			onClick={() =>
				copyMeetingList(selected, meetingEntities, wmEntities)
			}
			disabled={disabled || selected.length === 0}
		/>
	);
}

export default CopyMeetingListButton;
