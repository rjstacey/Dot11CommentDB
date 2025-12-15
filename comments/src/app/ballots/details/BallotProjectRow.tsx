import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import type { BallotMultiple } from "@/hooks/ballotsEdit";
import type { BallotCreate, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import SelectProject from "../ProjectSelector";

export function BallotProjectRow({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const hasChanges = saved && saved.Project !== edited.Project;
	const cn = hasChanges ? "has-changes" : undefined;

	return (
		<Form.Group as={Row} className="mb-2">
			<Form.Label htmlFor="ballot-project" column>
				Project:
			</Form.Label>
			<Col xs="auto" className="position-relative">
				<SelectProject
					id="ballot-project"
					className={cn}
					style={{ width: 300 }}
					value={isMultiple(edited.Project) ? "" : edited.Project}
					onChange={(Project) => onChange({ Project })}
					groupId={isMultiple(edited.groupId) ? null : edited.groupId}
					placeholder={
						isMultiple(edited.Project) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
					isInvalid={!edited.Project && !isMultiple(edited.Project)}
				/>
				<Form.Control.Feedback type="invalid" tooltip>
					Select an existing or add a new project (e.g., P802.11bn)
				</Form.Control.Feedback>
				{hasChanges && (
					<Form.Text>
						{isMultiple(saved.Project)
							? MULTIPLE_STR
							: saved.Project}
					</Form.Text>
				)}
			</Col>
		</Form.Group>
	);
}
