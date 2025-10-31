import * as React from "react";
import { Form, Row, Col, Button, Spinner, Dropdown } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySession,
} from "@/store/imatAttendanceSummary";
import {
	selectMemberEntities,
	addMembers,
	updateMembers,
	Member,
	MemberUpdate,
} from "@/store/members";
import { importAttendanceSummary } from "@/store/attendanceSummaries";

import { sessionAttendeeToNewMember } from "../imat/utils";

function BulkUpdateForm({ close }: { close: () => void }) {
	const { groupName, selected, ids, entities } = useAppSelector(
		selectImatAttendanceSummaryState
	);
	const session = useAppSelector(selectImatAttendanceSummarySession)!;

	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const [importAttendance, setImportAttendance] = React.useState(true);
	const [importNew, setImportNew] = React.useState(true);
	const [importUpdates, setImportUpdates] = React.useState(true);
	const [busy, setBusy] = React.useState(false);

	const dispatch = useAppDispatch();
	const memberEntities = useAppSelector(selectMemberEntities);

	const list = selectedOnly ? selected : ids;

	const adds = React.useMemo(
		() =>
			list
				.map((id) => entities[id]!)
				.filter(
					(attendee) => attendee && !memberEntities[attendee.SAPIN]
				)
				.map((attendee) =>
					sessionAttendeeToNewMember(attendee, session)
				),
		[list, entities, memberEntities, session]
	);

	const updates = React.useMemo(() => {
		const updates: MemberUpdate[] = [];
		list.map((id) => entities[id]!)
			.filter((attendee) => attendee && memberEntities[attendee.SAPIN])
			.forEach((a) => {
				const m = memberEntities[a.SAPIN]!;
				const changes: Partial<Member> = {
					Name: m.Name !== a.Name ? a.Name : undefined,
					Email: m.Email !== a.Email ? a.Email : undefined,
					Affiliation:
						m.Affiliation !== a.Affiliation
							? a.Affiliation
							: undefined,
					Employer:
						m.Employer !== a.Employer ? a.Employer : undefined,
				};
				let key: keyof Member;
				for (key in changes)
					if (typeof changes[key] === "undefined")
						delete changes[key];
				if (Object.keys(changes).length > 0)
					updates.push({ id: m.SAPIN, changes });
			});
		return updates;
	}, [list, entities, memberEntities]);

	async function handleSubmit() {
		setBusy(true);
		if (importAttendance)
			await dispatch(
				importAttendanceSummary(groupName!, session.number!)
			);
		if (importNew) await dispatch(addMembers(adds));
		if (importUpdates) await dispatch(updateMembers(updates));
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
					checked={importAttendance}
					onChange={() => setImportAttendance(!importAttendance)}
					label="Import session attendance"
				/>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
					label="Add new members"
				/>
				<Form.Text>{`${adds.length} new members`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
					label="Update member details"
				/>
				<Form.Text>{`${updates.length} members to be updated`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={selectedOnly}
					onChange={() => setSelectedOnly(!selectedOnly)}
					label="Selected entries only"
				/>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner animation="border" size="sm" />}
						<span>Update</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function BulkUpdateDropdown({ disabled }: { disabled?: boolean }) {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle variant="success-outline" disabled={disabled}>
				Bulk Update
			</Dropdown.Toggle>
			<Dropdown.Menu>
				<BulkUpdateForm close={() => setShow(false)} />
			</Dropdown.Menu>
		</Dropdown>
	);
}
