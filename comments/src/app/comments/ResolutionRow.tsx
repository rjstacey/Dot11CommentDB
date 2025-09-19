import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, MULTIPLE, Multiple } from "@common";

import type { Resolution, ResnStatusType } from "@/store/comments";

import Editor from "@/components/editor";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";
import type { ResolutionEditable } from "./ResolutionEdit";

import styles from "./comments.module.css";

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

	return (
		<Form.Group
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
				readOnly={readOnly}
				label="ACCEPTED"
				className={styles.acceptedCheckbox}
			/>
			<Form.Check
				id="revised-checkbox"
				name="ResnStatus"
				value="V"
				checked={value === "V"}
				ref={(ref) => ref && (ref.indeterminate = isMultiple(value))}
				onChange={handleChange}
				readOnly={readOnly}
				label="REVISED"
				className={styles.revisedCheckbox}
			/>
			<Form.Check
				id="rejected-checkbox"
				name="ResnStatus"
				value="J"
				checked={value === "J"}
				ref={(ref) => ref && (ref.indeterminate = isMultiple(value))}
				onChange={handleChange}
				readOnly={readOnly}
				label="REJECTED"
				className={styles.rejectedCheckbox}
			/>
			<div className={styles.shadow} />
			<div className={styles.block} />
		</Form.Group>
	);
}

export function ResolutionRow({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	let className = styles.resolutionContainer;
	if (!isMultiple(resolution.ResnStatus)) {
		if (resolution.ResnStatus === "A") className += " accepted";
		else if (resolution.ResnStatus === "V") className += " revised";
		else if (resolution.ResnStatus === "J") className += " rejected";
	}
	if (readOnly) className += " readonly";

	return (
		<Row className="mt-3 mb-2">
			<Col className={styles.resolutionField}>
				<Form.Label as="span">Resolution:</Form.Label>
				<div className={className}>
					<ResnStatus
						value={resolution.ResnStatus}
						onChange={(value) =>
							updateResolution({ ResnStatus: value })
						}
						readOnly={readOnly}
					/>
					<Editor
						className={styles.resolutionEditor}
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
		</Row>
	);
}
