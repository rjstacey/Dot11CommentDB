import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { useResultsEdit } from "@/hooks/resultsEdit";

import ShowAccess from "@/components/ShowAccess";
import { ResultEditForm } from "./ResultEditForm";

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function ResultsDetail({
	access,
	readOnly,
}: {
	access: number;
	readOnly?: boolean;
}) {
	const isOnline = useAppSelector(selectIsOnline);

	const { state, onChange, hasChanges, submit, cancel, onDelete } =
		useResultsEdit(readOnly!);
	const onAdd = () => {};

	let title = "Result";
	let content: React.ReactNode;
	if (state.action === "add" || state.action === "update") {
		if (state.action === "add") title = "Add result";
		else if (hasChanges()) title = "Update result";
		content = (
			<ResultEditForm
				action={state.action}
				edited={state.edited}
				hasChanges={hasChanges}
				onChange={onChange}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <Placeholder>{state.message}</Placeholder>;
	}

	const actionButtons = readOnly ? null : (
		<>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add result"
				//disabled={!isOnline}
				disabled={true}
				active={state.action === "add"}
				onClick={onAdd}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete result"
				disabled={state.action !== "update" || !isOnline}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</>
	);

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center mb-3">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
				<Col xs="auto" className="d-flex gap-2">
					{actionButtons}
				</Col>
			</Row>

			{content}
			<ShowAccess access={access} />
		</Container>
	);
}
