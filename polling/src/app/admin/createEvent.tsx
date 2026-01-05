import React from "react";
import { DateTime } from "luxon";
import { Form, Row, DropdownButton, Col } from "react-bootstrap";
import { InputTime } from "@common";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { pollingAdminEventCreate, EventCreate } from "@/store/pollingAdmin";
import { selectSelectedGroupId } from "@/store/groups";

import TimeZoneSelector from "@/components/TimeZoneSelector";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

function useNullEvent() {
	const groupId = useAppSelector(selectSelectedGroupId)!;
	return React.useMemo(() => {
		const event: EventCreate = {
			groupId,
			name: "",
			timeZone: "America/New_York",
			datetime: new Date().toISOString(),
		};
		return event;
	}, [groupId]);
}

function CreateEventForm({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const nullEvent = useNullEvent();
	const [event, setEvent] = React.useState<EventCreate>(nullEvent);
	const d = DateTime.fromISO(event.datetime || "", { zone: event.timeZone });
	const [time, setTime] = React.useState(d.toFormat("HH:mm"));
	const [date, setDate] = React.useState<string | undefined>(
		d.toISODate() || undefined
	);
	const [formValid, setFormValid] = React.useState<boolean>(false);

	function changeEvent(changes: Partial<EventCreate>) {
		setEvent((event) => ({ ...event, ...changes }));
	}

	function datetimeConversion(
		event: EventCreate,
		date: string | undefined,
		time: string
	) {
		if (!event.timeZone || !date || !time) return;
		let d = DateTime.fromISO(date, { zone: event.timeZone });
		if (!d.isValid) return;
		const t = DateTime.fromFormat(time, "HH:mm");
		if (!t.isValid) return;
		d = d.set({ hour: t.hour, minute: t.minute });
		return { ...event, datetime: d.toISO() };
	}

	async function submit() {
		const updatedEvent = datetimeConversion(event, date, time);
		if (updatedEvent) {
			await dispatch(pollingAdminEventCreate(updatedEvent));
			close();
		}
	}

	React.useEffect(() => {
		const isValid = datetimeConversion(event, date, time) !== undefined;
		setFormValid(isValid);
	}, [event, date, time]);

	return (
		<Form
			noValidate
			onSubmit={submit}
			style={{ width: 400 }}
			className="p-3"
		>
			<Form.Group as={Row} className="align-items-center mb-3">
				<Col xs="auto">
					<Form.Label htmlFor="eventName">Name:</Form.Label>
				</Col>
				<Col>
					<Form.Control
						id="eventName"
						type="text"
						value={event.name}
						onChange={(e) => changeEvent({ name: e.target.value })}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="align-items-center mb-3">
				<Col xs="auto">
					<Form.Label htmlFor="eventTimeZone">Timezone:</Form.Label>
				</Col>
				<Col>
					<TimeZoneSelector
						id="eventTimeZone"
						value={event.timeZone || ""}
						onChange={(value) => changeEvent({ timeZone: value })}
						isInvalid={!event.timeZone}
					/>
					<Form.Control.Feedback type="invalid">
						{"Select time zone"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="align-items-center mb-3">
				<Col>
					<Form.Label htmlFor="eventDate">Date:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="eventDate"
						type="date"
						value={date || ""}
						onChange={(e) => setDate(e.target.value || undefined)}
						isInvalid={!date}
					/>
					<Form.Control.Feedback type="invalid">
						{"Set date"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="align-items-center mb-3">
				<Col>
					<Form.Label htmlFor="eventTime">Time:</Form.Label>
				</Col>
				<Col>
					<InputTime
						id="eventTime"
						value={time}
						onChange={setTime}
						isInvalid={!time}
					/>
					<Form.Control.Feedback type="invalid">
						{"Set time"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<SubmitCancelRow
				submitLabel="Add"
				cancel={close}
				disabled={!formValid}
			/>
		</Form>
	);
}

function CreateEvent({ className }: { className?: string }) {
	const [show, setShow] = React.useState(false);
	const title = (
		<span>
			<i className="bi-plus-lg me-2" />
			{"Event"}
		</span>
	);
	return (
		<DropdownButton
			variant="outline-primary"
			title={title}
			show={show}
			onToggle={() => setShow(!show)}
			className={className}
		>
			<CreateEventForm close={() => setShow(false)} />
		</DropdownButton>
	);
}

export default CreateEvent;
