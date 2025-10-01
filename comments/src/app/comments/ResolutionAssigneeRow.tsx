import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { AssigneeSelect } from "./AssigneeSelect";
import { SubmissionSelect } from "./SubmissionSelect";

import type { Resolution } from "@/store/comments";
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

export function ResolutionAssigneeMotionRow({
	resolution,
	updateResolution,
	readOnly,
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
		</>
	);
}
