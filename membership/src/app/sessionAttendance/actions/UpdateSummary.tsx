import * as React from "react";
import {
	Form,
	Row,
	Col,
	Button,
	Spinner,
	DropdownButton,
} from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteAttendanceSummaries } from "@/store/attendanceSummaries";
import {
	selectSessionAttendanceSummaryIds,
	selectSessionAttendanceSummaryEntities,
} from "@/store/sessionAttendanceSummary";

function UpdateForm({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const [deleteNoAttendance, setDeleteNoAttendance] = React.useState(true);
	const ids = useAppSelector(selectSessionAttendanceSummaryIds);
	const entities = useAppSelector(selectSessionAttendanceSummaryEntities);
	const [busy, setBusy] = React.useState(false);

	const deleteIds = React.useMemo(
		() =>
			ids.filter((id) => {
				const attendee = entities[id]!;
				return attendee.AttendancePercentage === null;
			}),
		[ids, entities]
	);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		if (deleteNoAttendance)
			await dispatch(deleteAttendanceSummaries(deleteIds));
		setBusy(false);
		close();
	}

	return (
		<Form
			onSubmit={handleSubmit}
			className="ps-4 p-3"
			style={{ width: 300 }}
		>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={deleteNoAttendance}
					onChange={() => setDeleteNoAttendance(!deleteNoAttendance)}
					label="Delete entries with no attendance"
				/>
				<Form.Text>{`${deleteIds.length} entries`}</Form.Text>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						<Spinner size="sm" hidden={!busy} className="me-2" />
						<span>Update</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function UpdateSummary() {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="success-outline"
			align="end"
			show={show}
			onToggle={() => setShow(!show)}
			title="Update"
		>
			<UpdateForm close={() => setShow(false)} />
		</DropdownButton>
	);
}
