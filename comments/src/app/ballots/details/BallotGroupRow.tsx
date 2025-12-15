import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import type { BallotMultiple } from "@/hooks/ballotsEdit";
import type { BallotCreate, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import SelectGroup from "../GroupSelector";

export function BallotGroupRow({
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
	const hasChanges = saved && saved.groupId !== edited.groupId;
	const cn = hasChanges ? "has-changes" : undefined;
	return (
		<Form.Group as={Row} className="align-items-center mb-2">
			<Form.Label htmlFor="ballot-group" column>
				Group:
			</Form.Label>
			<Col xs="auto" className="position-relative">
				<SelectGroup
					id="ballot-group"
					className={cn}
					style={{ width: 300 }}
					value={isMultiple(edited.groupId) ? null : edited.groupId}
					onChange={(groupId) =>
						onChange({ groupId: groupId || undefined })
					}
					placeholder={
						isMultiple(edited.groupId) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
					isInvalid={!edited.groupId && !isMultiple(edited.groupId)}
				/>
				<Form.Control.Feedback type="invalid" tooltip>
					Select a group
				</Form.Control.Feedback>
			</Col>
		</Form.Group>
	);
}
