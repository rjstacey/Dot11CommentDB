import * as React from "react";

import {
	Row,
	Col,
	IconCollapse,
	List,
	ListItem,
	Checkbox,
	Input,
	isMultiple,
	Multiple,
} from "dot11-components";

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

function EditStatus({
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

export function EditingEdit({
	resolution,
	updateResolution = () => {},
	forceShowEditing,
	readOnly,
}: {
	resolution: Multiple<ResolutionEditEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	forceShowEditing?: boolean;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const showEditing: boolean | undefined =
		useAppSelector(selectCommentsState).ui.showEditing;
	const toggleShowEditing = () =>
		dispatch(setUiProperties({ showEditing: !showEditing }));

	return (
		<Row>
			<Col className={styles.editingField}>
				<div
					style={{
						display: "flex",
						flex: 1,
						justifyContent: "space-between",
					}}
				>
					<label>Editing:</label>
					{!forceShowEditing && (
						<IconCollapse
							isCollapsed={!showEditing}
							onClick={toggleShowEditing}
						/>
					)}
				</div>
				{(showEditing || forceShowEditing) && (
					<div className={styles.editingContainer}>
						<EditStatus
							resolution={resolution}
							updateResolution={updateResolution}
							readOnly={readOnly}
						/>
						<Editor
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
}

export default EditingEdit;
