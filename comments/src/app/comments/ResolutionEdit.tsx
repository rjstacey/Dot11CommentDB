import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, MULTIPLE, Multiple } from "@common";

import AssigneeSelector from "./AssigneeSelector";
import SubmissionSelector from "./SubmissionSelector";
import Editor from "@/components/editor";

import type {
	Resolution,
	ResnStatusType,
	ResolutionChange,
} from "@/store/comments";
import { AccessLevel } from "@/store/user";

import styles from "./comments.module.css";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

type ResolutionEditable = Required<Omit<ResolutionChange, "ResolutionID">>;

export function ResolutionAssignee({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} className="mb-3">
			<Form.Label column xs="auto" htmlFor="resolution-assignee">
				Assignee:
			</Form.Label>
			<Col>
				<AssigneeSelector
					id="resolution-assignee"
					value={
						isMultiple(resolution.AssigneeSAPIN) ||
						isMultiple(resolution.AssigneeName)
							? { SAPIN: 0, Name: "" }
							: {
									SAPIN: resolution.AssigneeSAPIN || 0,
									Name: resolution.AssigneeName || "",
							  }
					}
					onChange={({ SAPIN, Name }) =>
						updateResolution({
							AssigneeSAPIN: SAPIN,
							AssigneeName: Name,
						})
					}
					placeholder={
						isMultiple(
							resolution.AssigneeSAPIN || resolution.AssigneeName
						)
							? MULTIPLE_STR
							: BLANK_STR
					}
					readOnly={readOnly}
				/>
			</Col>
		</Form.Group>
	);
}

export function ResolutionSubmission({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row}>
			<Form.Label column xs="auto" htmlFor="resolution-submission">
				Submission:
			</Form.Label>
			<Col>
				<SubmissionSelector
					id="resolution-submission"
					value={
						isMultiple(resolution.Submission)
							? ""
							: resolution.Submission || ""
					}
					onChange={(value) =>
						updateResolution({ Submission: value })
					}
					placeholder={
						isMultiple(resolution.Submission)
							? MULTIPLE_STR
							: BLANK_STR
					}
					readOnly={readOnly}
				/>
			</Col>
		</Form.Group>
	);
}

export function ResolutionApproval({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const changeApproved: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		let value: string;
		if (e.target.name === "Approved")
			value = e.target.checked ? new Date().toDateString() : "";
		else value = e.target.value;
		updateResolution({ ApprovedByMotion: value });
	};

	const value = isMultiple(resolution.ApprovedByMotion)
		? ""
		: resolution.ApprovedByMotion || "";
	const placeholder = isMultiple(resolution.ApprovedByMotion)
		? MULTIPLE_STR
		: BLANK_STR;

	return (
		<>
			<Form.Group as={Row}>
				<Col>
					<Form.Check
						id="resolution-ReadyForMotion"
						name="ReadyForMotion"
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(
								resolution.ReadyForMotion
							))
						}
						checked={!!resolution.ReadyForMotion}
						onChange={(e) =>
							updateResolution({
								ReadyForMotion: e.target.checked,
							})
						}
						disabled={readOnly}
						label="Ready for motion"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="align-items-center">
				<Col xs="auto">
					<Form.Check
						id="resolution-ApprovedByMotion"
						name="Approved"
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(
								resolution.ApprovedByMotion
							))
						}
						checked={!!resolution.ApprovedByMotion}
						onChange={changeApproved}
						disabled={readOnly}
						label="Approved by motion"
					/>
				</Col>
				<Col>
					<Form.Control
						type="search"
						//size={value.length || placeholder.length}
						name="ApprovedByMotion"
						value={value}
						onChange={changeApproved}
						placeholder={placeholder}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

function ResnStatus({
	className,
	value,
	onChange,
	readOnly,
}: {
	className?: string;
	value: ResnStatusType | null | typeof MULTIPLE;
	onChange: (value: ResnStatusType | null) => void;
	readOnly?: boolean;
}) {
	const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
		onChange(e.target.checked ? (e.target.value as ResnStatusType) : null);
	const backgroundColor =
		(!isMultiple(value) && value && resnColor[value]) || "#fafafa";
	return (
		<Form.Group
			style={{ backgroundColor }}
			className={
				styles.resolutionStatus + (className ? ` ${className}` : "")
			}
		>
			<Form.Check
				id="accepted-checkbox"
				name="ResnStatus"
				value="A"
				checked={value === "A"}
				ref={(ref) => ref && (ref.indeterminate = isMultiple(value))}
				onChange={handleChange}
				disabled={readOnly}
				label="ACCEPTED"
			/>
			<Form.Check
				id="revised-checkbox"
				name="ResnStatus"
				value="V"
				checked={value === "V"}
				ref={(ref) => ref && (ref.indeterminate = isMultiple(value))}
				onChange={handleChange}
				disabled={readOnly}
				label="REVISED"
			/>
			<Form.Check
				id="rejected-checkbox"
				name="ResnStatus"
				value="J"
				checked={value === "J"}
				ref={(ref) => ref && (ref.indeterminate = isMultiple(value))}
				onChange={handleChange}
				disabled={readOnly}
				label="REJECTED"
			/>
		</Form.Group>
	);
}

const resnColor: Record<ResnStatusType, string> = {
	"": "#fafafa",
	A: "#d3ecd3",
	V: "#f9ecb9",
	J: "#f3c0c0",
};

export function ResolutionAndStatus({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const backgroundColor =
		(!isMultiple(resolution.ResnStatus) &&
			resolution.ResnStatus &&
			resnColor[resolution.ResnStatus]) ||
		"#fafafa";
	return (
		<Col className={styles.resolutionField}>
			<span className="label">Resolution:</span>
			<div
				className={
					styles.resolutionContainer + (readOnly ? " readonly" : "")
				}
			>
				<ResnStatus
					value={resolution.ResnStatus}
					onChange={(value) =>
						updateResolution({ ResnStatus: value })
					}
					readOnly={readOnly}
				/>
				<Editor
					className={styles.resolutionEditor}
					style={{ backgroundColor, borderRadius: "0 5px 5px 5px" }}
					value={
						isMultiple(resolution.Resolution)
							? ""
							: resolution.Resolution || ""
					}
					onChange={(value) =>
						updateResolution({ Resolution: value })
					}
					placeholder={
						isMultiple(resolution.Resolution)
							? MULTIPLE_STR
							: BLANK_STR
					}
					readOnly={readOnly}
				/>
			</div>
		</Col>
	);
}

export function ResolutionEdit({
	resolution,
	updateResolution,
	readOnly,
	commentsAccess = AccessLevel.none,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
	commentsAccess?: number;
}) {
	return (
		<>
			<Row className="mb-3">
				<Col>
					<ResolutionAssignee
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly}
					/>
					<ResolutionSubmission
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly}
					/>
				</Col>
				<Col>
					<ResolutionApproval
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly || commentsAccess < AccessLevel.rw}
					/>
				</Col>
			</Row>
			<Row className="mb-3">
				<ResolutionAndStatus
					resolution={resolution}
					updateResolution={updateResolution}
					readOnly={readOnly}
				/>
			</Row>
		</>
	);
}

export default ResolutionEdit;
