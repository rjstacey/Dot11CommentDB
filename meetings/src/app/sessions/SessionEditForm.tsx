import * as React from "react";
import { Form, Tabs, Tab } from "react-bootstrap";
import { shallowDiff } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setUiProperties,
	selectSessionsState,
	Session,
	Room,
	Timeslot,
} from "@/store/sessions";

import type { MultipleSession } from "@/hooks/sessionsEdit";
import { SessionBasicsEdit } from "./SessionBasicsEdit";
import RoomDetails from "./RoomDetails";
import TimeslotDetails from "./TimeslotDetails";
import SessionCredit from "./SessionCredit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function SessionEditForm({
	edited,
	saved,
	onChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	edited: MultipleSession;
	saved: MultipleSession;
	onChange: (changes: Partial<Session>) => void;
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [formValid, setFormValid] = React.useState(false);
	const uiProperties = useAppSelector(selectSessionsState).ui;

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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form noValidate onSubmit={handleSubmit} className="p-3">
			<SessionBasicsEdit
				session={edited}
				original={saved}
				updateSession={onChange}
				readOnly={readOnly}
			/>
			{(edited.type === "p" || edited.type === "i") && (
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
							setRooms={(rooms) => onChange({ rooms })}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Timeslots" eventKey={1}>
						<TimeslotDetails
							timeslots={edited.timeslots as Timeslot[]}
							original={saved.timeslots as Timeslot[]}
							setTimeslots={(timeslots) =>
								onChange({ timeslots })
							}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Credit" eventKey={2}>
						<SessionCredit
							session={edited as Session}
							original={saved as Session}
							updateSession={onChange}
							readOnly={readOnly}
						/>
					</Tab>
				</Tabs>
			)}
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel="Update"
					cancel={cancel}
					disabled={!formValid}
					busy={busy}
				/>
			)}
		</Form>
	);
}
