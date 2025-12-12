import * as React from "react";
import { Form, Row, Col } from "react-bootstrap";
import { Select, isMultiple } from "@common";

import type { Session } from "@/store/sessions";
import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/edit/convertMeetingEntry";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

function RoomSelector({
	value,
	onChange,
	session,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	session: Session;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const rooms = session.rooms || [];
	const handleChange = (values: typeof rooms) =>
		onChange(values.length > 0 ? values[0].id : null);
	const values = rooms.filter((room) => room.id === value);
	return (
		<Select
			options={rooms}
			values={values}
			onChange={handleChange}
			labelField="name"
			valueField="id"
			{...props}
		/>
	);
}

export function MeetingsLocationEdit({
	entry,
	session,
	changeEntry,
	readOnly,
}: {
	entry: MeetingEntryMultiple;
	session: Session;
	changeEntry: (changes: MeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} className="mb-3">
			<Form.Label htmlFor="meeting-location" column>
				Location:
			</Form.Label>
			<Col xs="auto">
				{entry.isSessionMeeting ? (
					<RoomSelector
						id="meeting-location"
						session={session}
						value={isMultiple(entry.roomId) ? null : entry.roomId}
						onChange={(roomId) =>
							changeEntry({ roomId, location: "" })
						}
						placeholder={
							isMultiple(entry.roomId) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
					/>
				) : (
					<Form.Control
						id="meeting-location"
						type="search"
						style={{ width: 200 }}
						value={
							isMultiple(entry.location)
								? ""
								: entry.location || ""
						}
						onChange={(e) =>
							changeEntry({
								location: e.target.value,
							})
						}
						placeholder={
							isMultiple(entry.location)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				)}
			</Col>
		</Form.Group>
	);
}
