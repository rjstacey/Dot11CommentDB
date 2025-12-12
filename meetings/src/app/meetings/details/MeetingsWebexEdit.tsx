import type { WebexMeetingEntryPartial } from "@/edit/convertWebexMeetingEntry";
import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/edit/convertMeetingEntry";
import {
	WebexMeetingAccount,
	WebexMeetingParamsEdit,
} from "../../webexMeetings/WebexMeetingEditForm";

export function MeetingsWebexEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: MeetingEntryMultiple;
	changeEntry: (changes: MeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	function handleWebexMeetingChange(
		webexMeetingChanges: WebexMeetingEntryPartial
	) {
		const changes: MeetingEntryPartial = {
			webexMeeting: webexMeetingChanges,
		};
		if ("accountId" in webexMeetingChanges)
			changes.webexAccountId = webexMeetingChanges.accountId;
		changeEntry(changes);
	}

	return (
		<>
			<WebexMeetingAccount
				entry={
					entry.webexMeeting
						? entry.webexMeeting
						: { accountId: entry.webexAccountId }
				}
				changeEntry={handleWebexMeetingChange}
				readOnly={readOnly}
			/>
			{entry.webexMeeting && entry.webexMeeting.accountId ? (
				<WebexMeetingParamsEdit
					entry={entry.webexMeeting}
					changeEntry={handleWebexMeetingChange}
					readOnly={readOnly}
				/>
			) : null}
		</>
	);
}
