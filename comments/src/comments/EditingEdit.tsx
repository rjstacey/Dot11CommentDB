import React from "react";

import {
	Row,
	Col,
	IconCollapse,
	List,
	ListItem,
	Checkbox,
	Input,
	isMultiple,
} from "dot11-components";

import RichTextEditor from "./RichTextEditor";

import type { MultipleResolution } from "./CommentDetail";
import type { Resolution } from "../store/comments";

import styles from "./comments.module.css";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

function EditStatus({
	resolution,
	updateResolution,
	readOnly,
}: {
	resolution: MultipleResolution;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const changeEditStatus: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		let fields: Partial<Resolution> = {};
		if (e.target.name === "EditStatus") {
			if (e.target.checked) {
				fields.EditStatus = e.target.value;
				if (e.target.value === "I") {
					fields.EditInDraft = "1.0";
				} else {
					fields.EditInDraft = "";
				}
			} else {
				fields.EditStatus = "";
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
		<List label="" onClick={(e) => e.stopPropagation()}>
			<ListItem>
				<Checkbox
					name="EditStatus"
					value="I"
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === "I"}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>Implemented in draft:</label>
				<Input
					type="number"
					style={{ width: 80 }}
					pattern="^\d*(\.\d{0,2})?$"
					step="0.1"
					name="EditInDraft"
					value={editInDraft || ""}
					onChange={changeEditStatus}
					placeholder={placeholder}
					disabled={readOnly}
				/>
			</ListItem>
			<ListItem>
				<Checkbox
					name="EditStatus"
					value="N"
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === "N"}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>No Change</label>
			</ListItem>
		</List>
	);
}

export const EditingEdit = ({
	resolution,
	updateResolution = () => {},
	showEditing,
	toggleShowEditing,
	readOnly,
}: {
	resolution: MultipleResolution;
	updateResolution?: (changes: Partial<Resolution>) => void;
	showEditing: boolean;
	toggleShowEditing?: () => void;
	readOnly?: boolean;
}) => (
	<Row>
		<Col
			style={{
				width: "100%",
				position: "relative", // position toolbar
				paddingTop: 15, // make room for toolbar
			}}
		>
			<div
				style={{
					display: "flex",
					flex: 1,
					justifyContent: "space-between",
				}}
			>
				<label>Editing:</label>
				{toggleShowEditing && (
					<IconCollapse
						isCollapsed={!showEditing}
						onClick={toggleShowEditing}
					/>
				)}
			</div>
			{showEditing && (
				<div className={styles.editingContainer}>
					<EditStatus
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly}
					/>
					<RichTextEditor
						value={
							isMultiple(resolution.EditNotes)
								? ""
								: resolution.EditNotes
						}
						onChange={(value) =>
							updateResolution({ EditNotes: value })
						}
						placeholder={
							isMultiple(resolution.EditNotes)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</div>
			)}
		</Col>
	</Row>
);

export default EditingEdit;
