import * as React from "react";
import { Form, Tabs, Tab } from "react-bootstrap";
import { deepMergeTagMultiple, shallowDiff } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	updateSession,
	setUiProperties,
	selectSessionsState,
	Session,
	Room,
	Timeslot,
} from "@/store/sessions";

import type { MultipleSession } from "./SessionDetails";
import { SessionBasicsEdit } from "./SessionBasicsEdit";
import RoomDetails from "./RoomDetails";
import TimeslotDetails from "./TimeslotDetails";
import SessionCredit from "./SessionCredit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function SessionEditForm({
	sessions,
	setBusy,
	readOnly,
}: {
	sessions: Session[];
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const uiProperties = useAppSelector(selectSessionsState).ui;

	const [edited, setEdited] = React.useState<MultipleSession | null>(null);
	const [saved, setSaved] = React.useState<MultipleSession | null>(null);
	const [editedSessions, setEditedSessions] = React.useState<Session[]>([]);

	const [formValid, setFormValid] = React.useState(false);

	React.useEffect(() => {
		let valid = true;
		const changes = shallowDiff(saved!, edited!) as Partial<Session>;
		if ("number" in changes && !changes.number) valid = false;
		if ("name" in changes && !changes.name) valid = false;
		if ("groupId" in changes && !changes.groupId) valid = false;
		if ("startDate" in changes && !changes.startDate) valid = false;
		if ("endDate" in changes && !changes.endDate) valid = false;
		if ("timezone" in changes && !changes.timezone) valid = false;
		setFormValid(valid);
	}, [edited, saved]);

	React.useEffect(() => {
		if (
			sessions.map((s) => s.id).join() ===
			editedSessions.map((s) => s.id).join()
		)
			return;
		let diff: MultipleSession | null = null;
		sessions.forEach((s) => {
			diff = deepMergeTagMultiple(diff || {}, s) as MultipleSession;
		});
		setEdited(diff);
		setSaved(diff);
		setEditedSessions(sessions);
	}, [sessions, editedSessions]);

	const hasChanges = React.useMemo(() => {
		const changes = shallowDiff(saved!, edited!) as Partial<Session>;
		return Object.keys(changes).length > 0;
	}, [saved, edited]);

	function submitForm(e: React.FormEvent) {
		e.preventDefault();
		const changes = shallowDiff(saved!, edited!) as Partial<Session>;
		if (Object.keys(changes).length > 0) {
			setBusy(true);
			editedSessions.forEach((s) =>
				dispatch(updateSession(s.id, changes))
			);
			setBusy(false);
		}
		setSaved(edited);
	}

	function handleUpdate(changes: Partial<Session>) {
		setEdited((edited) => ({ ...edited!, ...changes }));
	}

	function handleCancel() {
		setEdited(saved);
	}

	const session = editedSessions.length === 1 ? editedSessions[0] : null;

	if (!edited || !saved) return null;

	return (
		<Form noValidate onSubmit={submitForm} className="main">
			<SessionBasicsEdit
				session={edited}
				original={saved}
				updateSession={handleUpdate}
				readOnly={readOnly}
			/>
			{session && (session.type === "p" || session.type === "i") && (
				<Tabs
					onSelect={(tabIndex) => {
						dispatch(setUiProperties({ tabIndex }));
					}}
					activeKey={uiProperties.tabIndex || 0}
				>
					<Tab title="Rooms" eventKey={0}>
						<RoomDetails
							rooms={edited.rooms as Room[]}
							original={saved.rooms as Room[]}
							setRooms={(rooms) => handleUpdate({ rooms })}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Timeslots" eventKey={1}>
						<TimeslotDetails
							timeslots={edited.timeslots as Timeslot[]}
							original={saved.timeslots as Timeslot[]}
							setTimeslots={(timeslots) =>
								handleUpdate({ timeslots })
							}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Credit" eventKey={2}>
						<SessionCredit
							session={edited as Session}
							original={saved as Session}
							updateSession={handleUpdate}
							readOnly={readOnly}
						/>
					</Tab>
				</Tabs>
			)}
			{hasChanges && (
				<SubmitCancelRow
					submitLabel="Update"
					cancel={handleCancel}
					disabled={!formValid}
				/>
			)}
		</Form>
	);
}
