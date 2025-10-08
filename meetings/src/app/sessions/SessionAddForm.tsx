import * as React from "react";
import { Form, Tabs, Tab } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addSession,
	setSelected,
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

const defaultSession: SessionCreate = {
	number: null,
	name: "",
	type: "p",
	isCancelled: false,
	imatMeetingId: null,
	startDate: new Date().toISOString().substring(0, 10),
	endDate: new Date().toISOString().substring(0, 10),
	timezone: "America/New_York",
	groupId: null,
	rooms: [],
	timeslots: [],
	defaultCredits: [],
	OrganizerID: "",
};

export function SessionAddForm({
	close,
	setBusy,
	readOnly,
}: {
	close?: () => void;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const uiProperties = useAppSelector(selectSessionsState).ui;

	const [session, setSession] = React.useState(defaultSession);
	const [formValid, setFormValid] = React.useState(false);

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
		const id = await dispatch(addSession(session));
		dispatch(setSelected(id ? [id] : []));
		setBusy(false);
		close?.();
	}

	return (
		<Form noValidate onSubmit={handleSubmit}>
			<SessionBasicsEdit
				session={session}
				updateSession={(changes) =>
					setSession((session) => ({ ...session, ...changes }))
				}
				readOnly={false}
			/>
			<Tabs
				onSelect={(tabIndex) => {
					dispatch(setUiProperties({ tabIndex }));
				}}
				activeKey={uiProperties.tabIndex || 0}
			>
				<Tab title="Rooms" eventKey={0}>
					<RoomDetails
						rooms={session.rooms}
						setRooms={(rooms) =>
							setSession((session) => ({ ...session, rooms }))
						}
						readOnly={readOnly}
					/>
				</Tab>
				<Tab title="Timeslots" eventKey={1}>
					<TimeslotDetails
						timeslots={session.timeslots}
						setTimeslots={(timeslots) =>
							setSession((session) => ({ ...session, timeslots }))
						}
						readOnly={readOnly}
					/>
				</Tab>
				<Tab title="Credit" eventKey={2}>
					<SessionCredit
						session={session as Session}
						updateSession={(changes) =>
							setSession((session) => ({
								...session,
								...changes,
							}))
						}
						readOnly={readOnly}
					/>
				</Tab>
			</Tabs>
			{!readOnly && (
				<SubmitCancelRow
					submitLabel="Add"
					cancel={close}
					disabled={!formValid}
				/>
			)}
		</Form>
	);
}
