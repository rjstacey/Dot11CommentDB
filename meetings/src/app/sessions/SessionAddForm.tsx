import * as React from "react";
import { Form, Tabs, Tab } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setUiProperties,
	selectSessionsState,
	SessionCreate,
	Session,
} from "@/store/sessions";

import { SessionBasicsEdit } from "./SessionBasicsEdit";
import RoomDetails from "./RoomDetails";
import TimeslotDetails from "./TimeslotDetails";
import SessionCredit from "./SessionCredit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function SessionAddForm({
	submit,
	cancel,
	edited: session,
	onChange,
}: {
	submit: () => Promise<void>;
	cancel: () => void;
	edited: SessionCreate;
	onChange: (changes: Partial<SessionCreate>) => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [formValid, setFormValid] = React.useState(false);
	const uiProperties = useAppSelector(selectSessionsState).ui;

	React.useEffect(() => {
		let valid = true;
		if (!session.number) valid = false;
		if (!session.name) valid = false;
		if (!session.groupId) valid = false;
		if (!session.startDate) valid = false;
		if (!session.endDate) valid = false;
		if (!session.timezone) valid = false;
		setFormValid(valid);
	}, [session]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form noValidate onSubmit={handleSubmit} className="p-3">
			<SessionBasicsEdit session={session} updateSession={onChange} />
			<Tabs
				onSelect={(tabIndex) => {
					dispatch(setUiProperties({ tabIndex }));
				}}
				activeKey={uiProperties.tabIndex || 0}
			>
				<Tab title="Rooms" eventKey={0}>
					<RoomDetails
						rooms={session.rooms}
						setRooms={(rooms) => onChange({ rooms })}
					/>
				</Tab>
				<Tab title="Timeslots" eventKey={1}>
					<TimeslotDetails
						timeslots={session.timeslots}
						setTimeslots={(timeslots) => onChange({ timeslots })}
					/>
				</Tab>
				<Tab title="Credit" eventKey={2}>
					<SessionCredit
						session={session as Session}
						updateSession={onChange}
					/>
				</Tab>
			</Tabs>
			<SubmitCancelRow
				submitLabel="Add"
				cancel={cancel}
				disabled={!formValid}
				busy={busy}
			/>
		</Form>
	);
}
