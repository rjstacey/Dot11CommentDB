import { Form, Row, Col } from "react-bootstrap";
import { isMultiple } from "@common";

import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/hooks/meetingsEdit";
import { MULTIPLE_STR } from "@/components/constants";
import CalendarAccountSelector from "@/components/CalendarAccountSelector";

export function MeetingsCalendarEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: MeetingEntryMultiple;
	changeEntry: (changes: MeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} className="mb-3">
			<Col>
				<Form.Label htmlFor="meeting-calendar">Calendar:</Form.Label>
			</Col>
			<Col xs="auto">
				<CalendarAccountSelector
					id="meeting-calendar"
					value={
						isMultiple(entry.calendarAccountId)
							? null
							: entry.calendarAccountId
					}
					onChange={(calendarAccountId) =>
						changeEntry({ calendarAccountId })
					}
					placeholder={
						isMultiple(entry.calendarAccountId)
							? MULTIPLE_STR
							: undefined
					}
					readOnly={readOnly}
				/>
			</Col>
		</Form.Group>
	);
}
