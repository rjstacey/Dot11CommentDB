import React from "react";
import { DateTime } from "luxon";
import {
	Button,
	Form,
	Row,
	Dropdown,
	DropdownRendererProps,
	Field,
	Input,
	InputDates,
	InputTime,
} from "dot11-components";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { pollingAdminCreateEvent, EventCreate } from "../store/pollingAdmin";
import TimeZoneSelector from "./TimeZoneSelector";
import { selectSelectedGroupId } from "../store/groups";

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

function CreateEventForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const nullEvent = useNullEvent();
	const [event, setEvent] = React.useState<EventCreate>(nullEvent);
	const d = DateTime.fromISO(event.datetime || "", { zone: event.timeZone });
	const [time, setTime] = React.useState(d.toFormat("HH:mm"));
	const [date, setDate] = React.useState<string | undefined>(
		d.toISODate() || undefined
	);
	const [errorText, setErrorText] = React.useState<string | undefined>();

	function changeEvent(changes: Partial<EventCreate>) {
		setEvent((event) => ({ ...event, ...changes }));
	}

	function datetimeConversion(
		event: EventCreate,
		date: string | undefined,
		time: string
	) {
		if (!event.timeZone) {
			setErrorText("Set time zone");
			return;
		}
		if (!date) {
			setErrorText("Date not set");
			return;
		}
		let d = DateTime.fromISO(date, { zone: event.timeZone });
		if (!d.isValid) {
			setErrorText("Invalid date");
			return;
		}
		let t = DateTime.fromFormat(time, "HH:mm");
		if (!t.isValid) {
			setErrorText("Invalid time");
			return;
		}
		d = d.set({ hour: t.hour, minute: t.minute });
		setErrorText(undefined);
		return { ...event, datetime: d.toISO()! };
	}

	function changeDate(dates: string[]) {
		const [date] = dates;
		setDate(date);
		datetimeConversion(event, date, time);
	}

	function changeTime(time: string) {
		setTime(time);
		datetimeConversion(event, date, time);
	}

	async function submit() {
		const updatedEvent = datetimeConversion(event, date, time);
		if (updatedEvent) {
			await dispatch(pollingAdminCreateEvent(updatedEvent));
			methods.close();
		}
	}

	return (
		<Form
			style={{ width: 300 }}
			title="Add Event"
			submitLabel="Add"
			submit={submit}
			cancel={methods.close}
			errorText={errorText}
		>
			<Row>
				<Field label="Name:">
					<Input
						type="text"
						value={event.name}
						onChange={(e) => changeEvent({ name: e.target.value })}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Time zone:">
					<TimeZoneSelector
						style={{ width: 200, height: 35 }}
						value={event.timeZone || ""}
						onChange={(value) => changeEvent({ timeZone: value })}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Date:">
					<InputDates
						multi={false}
						value={date ? [date] : undefined}
						onChange={changeDate}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Time:">
					<InputTime value={time} onChange={changeTime} />
				</Field>
			</Row>
		</Form>
	);
}

function CreateEventDropdown() {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({
				props,
				state,
				methods,
			}: DropdownRendererProps) => (
				<Button
					title="Export a list of voters"
					isActive={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				>
					+ Event
				</Button>
			)}
			dropdownRenderer={(props) => <CreateEventForm {...props} />}
		/>
	);
}

export default CreateEventDropdown;
