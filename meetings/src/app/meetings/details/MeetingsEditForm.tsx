import * as React from "react";
import { Duration } from "luxon";
import { Form } from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";

import { setError } from "@/store";
import type { Session } from "@/store/sessions";

import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/edit/meetingsEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { MeetingsBasicEdit } from "./MeetingsBasicEdit";
import { MeetingsImatEdit } from "./MeetingsImatEdit";
import { MeetingsWebexEdit } from "./MeetingsWebexEdit";
import { MeetingsCalendarEdit } from "./MeetingsCalendarEdit";

function validDuration(duration: string) {
	if (!duration) return false;
	const d = duration.trim();
	const m = /^(\d*):(\d{2})$/.exec(d);
	try {
		const dt = Duration.fromObject(
			m
				? { hours: m[1] ? Number(m[1]) : 0, minutes: Number(m[2]) }
				: { hours: Number(d) }
		);
		return dt.isValid;
	} catch {
		return false;
	}
}

function meetingEditErrorMessage(entry: MeetingEntryMultiple) {
	let errMsg: string | undefined;
	if (!entry.organizationId) errMsg = "Group not set";
	else if (entry.dates.length === 0) errMsg = "Date not set";
	else if (!entry.startTime) errMsg = "Start time not set";
	else if (entry.isSessionMeeting && !entry.endTime)
		errMsg = "End time not set";
	else if (!entry.isSessionMeeting && !validDuration(entry.duration))
		errMsg = "Duration not set";
	else if (!entry.timezone) errMsg = "Time zone not set";
	return errMsg;
}

export function MeetingsEditForm({
	entry,
	session,
	onChange,
	action,
	submit,
	cancel,
	hasChanges,
	readOnly,
}: {
	action: "add-by-slot" | "add-by-date" | "update";
	entry: MeetingEntryMultiple;
	session: Session;
	onChange: (changes: MeetingEntryPartial) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	hasChanges: () => boolean;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);

	async function onSubmit(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		const errMsg = meetingEditErrorMessage(entry);
		if (errMsg) {
			dispatch(setError("Fix error", errMsg));
			return;
		}
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form onSubmit={onSubmit} className="p-3">
			<MeetingsBasicEdit
				action={action}
				entry={entry}
				session={session}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<MeetingsImatEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<MeetingsWebexEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<MeetingsCalendarEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "update" ? "Update" : "Add"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
