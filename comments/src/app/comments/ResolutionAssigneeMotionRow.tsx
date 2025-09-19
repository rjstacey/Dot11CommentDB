import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { AssigneeSelect } from "./AssigneeSelect";
import { SubmissionSelect } from "./SubmissionSelect";

import type { Resolution } from "@/store/comments";
import { AccessLevel } from "@/store/user";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import type { ResolutionEditable } from "./ResolutionEdit";

export function ResolutionAssigneeRow({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} className="mb-2">
			<Form.Label column xs="auto" htmlFor="resolution-assignee">
				Assignee:
			</Form.Label>
			<Col>
				<AssigneeSelect
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

export function ResolutionSubmissionRow({
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
				<SubmissionSelect
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

export function ResolutionApprovalRow({
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
						readOnly={readOnly}
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
						readOnly={readOnly}
						label="Approved by motion"
					/>
				</Col>
				<Col>
					<Form.Control
						type="search"
						name="ApprovedByMotion"
						value={value}
						onChange={changeApproved}
						placeholder={placeholder}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

export function ResolutionAssigneeMotionRow({
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
			<Row className="mb-2">
				<Col>
					<ResolutionAssigneeRow
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly}
					/>
				</Col>
				<Col>
					<ResolutionSubmissionRow
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			<Row>
				<Col>
					<ResolutionApprovalRow
						resolution={resolution}
						updateResolution={updateResolution}
						readOnly={readOnly || commentsAccess < AccessLevel.rw}
					/>
				</Col>
			</Row>
		</>
	);
}
