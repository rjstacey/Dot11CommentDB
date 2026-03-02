import type { ReactNode } from "react";
import { Button, Container, Row, Col } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectUserMeetingsAccess, AccessLevel } from "@/store/meetings";

import { MeetingsEditForm } from "../meetings/details/MeetingsEditForm";
import { BreakoutEditForm } from "./BreakoutEditForm";
import { useImatBreakoutsEdit } from "@/hooks/imatBreakoutsEdit";

export function ImatBreakoutsDetails() {
	const access = useAppSelector(selectUserMeetingsAccess);
	const readOnly = access <= AccessLevel.ro;
	const {
		state,
		onAdd,
		onDelete,
		onImport,
		onChangeMeeting,
		onChangeBreakout,
		hasChanges,
		submit,
		cancel,
	} = useImatBreakoutsEdit(readOnly);

	const actionButtons = (
		<Col xs="auto" className="d-flex align-items-center gap-2">
			<Button
				variant="outline-primary"
				className="bi-cloud-download"
				title="Import as meeting"
				disabled={readOnly}
				onClick={onImport}
			>
				{" Import as meeting"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add breakout"
				disabled={readOnly}
				active={state.action === "add"}
				onClick={onAdd}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete breakout"
				disabled={state.breakouts.length === 0 || readOnly}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</Col>
	);

	let title = "Breakout";
	let content: ReactNode;
	if (state.action === "import") {
		title = "Import as meeting";
		content = (
			<MeetingsEditForm
				action="add-by-date"
				entry={state.edited}
				session={state.session}
				onChange={onChangeMeeting}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else if (state.action === "add" || state.action === "update") {
		if (state.action === "add") title = "Add breakout";
		else if (hasChanges()) title = "Update breakout";
		content = (
			<BreakoutEditForm
				action={state.action}
				entry={state.edited}
				onChange={onChangeBreakout}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <div className="placeholder">{state.message}</div>;
	}

	return (
		<Container fluid>
			<Row className="mb-3">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
				{actionButtons}
			</Row>
			{content}
		</Container>
	);
}
