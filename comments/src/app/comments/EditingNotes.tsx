import * as React from "react";
import { Row, Col, Form, Accordion } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import Editor from "@/components/editor";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	EditStatusType,
	selectCommentsState,
	setUiProperties,
	type Resolution,
} from "@/store/comments";

import styles from "./comments.module.css";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

// Resolution fields that are editable by this module
type ResolutionEditEditable = Pick<
	Resolution,
	"EditInDraft" | "EditNotes" | "EditStatus"
>;

function EditingStatus({
	resolution,
	updateResolution,
	readOnly,
}: {
	resolution: Multiple<ResolutionEditEditable>;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const changeEditStatus: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		const fields: Partial<Resolution> = {};
		if (e.target.name === "EditStatus") {
			if (e.target.checked) {
				fields.EditStatus = e.target.value as EditStatusType;
				if (e.target.value === "I") {
					fields.EditInDraft = "1.0";
				} else {
					fields.EditInDraft = "";
				}
			} else {
				fields.EditStatus = null;
				if (e.target.value === "I") {
					fields.EditInDraft = "";
				}
			}
		} else {
			fields.EditInDraft = e.target.value;
			if (e.target.value) {
				fields.EditStatus = "I";
			}
		}
		updateResolution(fields);
	};

	const editInDraft = isMultiple(resolution.EditInDraft)
		? ""
		: resolution.EditInDraft;
	const placeholder = isMultiple(resolution.EditInDraft)
		? MULTIPLE_STR
		: undefined;

	return (
		<>
			<Row className="align-items-center">
				<Col xs="auto">
					<Form.Check
						id="implementedindraft"
						name="EditStatus"
						value="I"
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(
								resolution.EditStatus
							))
						}
						checked={resolution.EditStatus === "I"}
						onChange={changeEditStatus}
						label="Implemented in draft"
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				</Col>
				<Col xs="auto">
					<Form.Control
						type="number"
						style={{ width: 80 }}
						pattern="^\d*(\.\d{0,2})?$"
						step="0.1"
						name="EditInDraft"
						value={editInDraft || ""}
						onChange={changeEditStatus}
						placeholder={placeholder}
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				</Col>
			</Row>
			<Row>
				<Col xs="auto">
					<Form.Check
						id="nochange"
						name="EditStatus"
						value="N"
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(
								resolution.EditStatus
							))
						}
						checked={resolution.EditStatus === "N"}
						onChange={changeEditStatus}
						label="No change"
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				</Col>
			</Row>
		</>
	);
}

function EditingNotesInternal({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<div className={styles.editingContainer}>
			<EditingStatus
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
			<Editor
				value={
					isMultiple(resolution.EditNotes) ? "" : resolution.EditNotes
				}
				onChange={(value) => updateResolution({ EditNotes: value })}
				placeholder={
					isMultiple(resolution.EditNotes) ? MULTIPLE_STR : BLANK_STR
				}
				readOnly={readOnly}
			/>
		</div>
	);
}

const editingNotesLabel = <Form.Label as="span">Editing Notes:</Form.Label>;

export function EditingNotesRow(props: {
	resolution: Multiple<ResolutionEditEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row className="mb-3">
			<Col xs={12}>{editingNotesLabel}</Col>
			<Col>
				<EditingNotesInternal {...props} />
			</Col>
		</Row>
	);
}

export function EditingNotesRowCollapsable(props: {
	resolution: Multiple<ResolutionEditEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const showEditingNotes: boolean | undefined =
		useAppSelector(selectCommentsState).ui.showEditingNotes;
	const key = "editing-notes";

	return (
		<Row className="mb-3">
			<Accordion
				flush
				className={styles.notesField}
				activeKey={showEditingNotes ? key : undefined}
				onSelect={(eventKey) =>
					dispatch(
						setUiProperties({ showEditingNotes: Boolean(eventKey) })
					)
				}
			>
				<Accordion.Item eventKey={key}>
					<Accordion.Header>
						<Form.Label as="span">Editing Notes:</Form.Label>
					</Accordion.Header>
					<Accordion.Body>
						<EditingNotesInternal {...props} />
					</Accordion.Body>
				</Accordion.Item>
			</Accordion>
		</Row>
	);
}
