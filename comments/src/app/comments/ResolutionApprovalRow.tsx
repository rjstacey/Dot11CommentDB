import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import type { Resolution } from "@/store/comments";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import type { ResolutionEditable } from "./ResolutionEdit";

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
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
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
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
						label="Approved by motion"
					/>
				</Col>
				<Col>
					<Form.Control
						style={{ maxWidth: "12em" }}
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
