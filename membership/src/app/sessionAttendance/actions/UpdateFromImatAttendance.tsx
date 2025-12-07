import * as React from "react";
import {
	Form,
	Row,
	Col,
	Button,
	Spinner,
	DropdownButton,
} from "react-bootstrap";
import { useSessionAttendanceEdit } from "@/edit/sessionAttendance";
import { useAppSelector } from "@/store/hooks";
import {
	selectImatAttendanceSummaryIds,
	selectImatAttendanceSummarySelected,
} from "@/store/imatAttendanceSummary";

function UpdateForm({ close }: { close: () => void }) {
	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const [importAttendance, setImportAttendance] = React.useState(true);
	const [importNew, setImportNew] = React.useState(true);
	const [importUpdates, setImportUpdates] = React.useState(true);
	const [busy, setBusy] = React.useState(false);
	const selected = useAppSelector(
		selectImatAttendanceSummarySelected
	) as number[];
	const ids = useAppSelector(selectImatAttendanceSummaryIds) as number[];

	const { state, submit } = useSessionAttendanceEdit(
		selectedOnly ? selected : ids,
		false
	);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		submit(importNew, importUpdates, importAttendance);
		setBusy(false);
		close();
	}

	let numAdds = 0;
	if (state.action === "addOne") numAdds = 1;
	else if (state.action === "updateMany") numAdds = state.adds.length;

	let numUpdates = 0;
	if (state.action === "updateOne") numUpdates = 1;
	else if (state.action === "updateMany") numUpdates = state.updates.length;

	return (
		<Form
			onSubmit={handleSubmit}
			className="ps-4 p-3"
			style={{ width: 300 }}
		>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={selectedOnly}
					onChange={() => setSelectedOnly(!selectedOnly)}
					label="Selected entries only"
				/>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importAttendance}
					onChange={() => setImportAttendance(!importAttendance)}
					label="Update session attendance"
				/>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
					label="Add new members"
				/>
				<Form.Text>{`${numAdds} new members`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
					label="Update member details"
				/>
				<Form.Text>{`${numUpdates} members to be updated`}</Form.Text>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						<Spinner size="sm" hidden={!busy} className="me-2" />
						<span>Submit</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function UpdateFromImatAttendance() {
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
