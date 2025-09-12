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
				readOnly={readOnly}
				label="ACCEPTED"
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

export function ResolutionRow({
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
		<Row className="mb-3">
			<Col className={styles.resolutionField}>
				<span className="label">Resolution:</span>
				<div
					className={
						styles.resolutionContainer +
						(readOnly ? " readonly" : "")
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
						style={{
							backgroundColor,
							borderRadius: "0 5px 5px 5px",
						}}
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
