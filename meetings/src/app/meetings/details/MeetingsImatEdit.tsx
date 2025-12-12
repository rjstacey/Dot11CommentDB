import * as React from "react";
import { Form, Row, Col } from "react-bootstrap";
import { Select, isMultiple } from "@common";
import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/edit/convertMeetingEntry";
import ImatMeetingSelector from "@/components/ImatMeetingSelector";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

const gracePeriodOptions = [
	{ value: 0, label: "None" },
	{ value: 5, label: "5 min" },
	{ value: 10, label: "10 min" },
];

function GracePeriodSelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "readOnly"
	| "disabled"
	| "id"
	| "className"
	| "style"
	| "placeholder"
	| "isInvalid"
>) {
	let options = gracePeriodOptions;
	let values = options.filter((o) => o.value === value);
	if (values.length === 0 && value !== null) {
		const option = { value, label: `${value} min` };
		options = options.concat([option]);
		values = [option];
	}

	const handleChange = React.useCallback(
		(values: typeof gracePeriodOptions) =>
			onChange(values.length ? values[0].value : 0),
		[onChange]
	);

	return (
		<Select
			options={options}
			values={values}
			onChange={handleChange}
			{...props}
		/>
	);
}

export function MeetingsImatEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: MeetingEntryMultiple;
	changeEntry: (changes: MeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-imat-grace-period">
						IMAT grace period:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<GracePeriodSelector
						id="meeting-imat-grace-period"
						//style={{ width: 200 }}
						value={
							isMultiple(entry.imatGracePeriod)
								? null
								: entry.imatGracePeriod
						}
						onChange={(imatGracePeriod) =>
							changeEntry({ imatGracePeriod })
						}
						placeholder={
							isMultiple(entry.imatGracePeriod)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-imat-meeting">
						IMAT meeting:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<ImatMeetingSelector
						id="meeting-imat-meeting"
						value={
							isMultiple(entry.imatMeetingId)
								? null
								: entry.imatMeetingId
						}
						onChange={(imatMeetingId) =>
							changeEntry({ imatMeetingId })
						}
						placeholder={
							isMultiple(entry.imatMeetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
