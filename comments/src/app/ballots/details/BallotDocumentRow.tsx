import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";
import type { BallotCreate, BallotChange } from "@/store/ballots";
import type { BallotMultiple } from "@/hooks/ballotsEdit";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

export function BallotDocumentRow({
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
	const hasChanges = saved && saved.Document !== edited.Document;
	const cn = hasChanges ? "has-changes" : undefined;
	return (
		<Form.Group as={Row} controlId="ballot-document" className="mb-2">
			<Form.Label column>Document version:</Form.Label>
			<Col xs="auto">
				<Form.Control
					type="search"
					className={cn}
					name="Document"
					value={isMultiple(edited.Document) ? "" : edited.Document}
					placeholder={
						isMultiple(edited.Document) ? MULTIPLE_STR : BLANK_STR
					}
					onChange={(e) =>
						onChange({ [e.target.name]: e.target.value })
					}
					readOnly={readOnly}
				/>
				{hasChanges && (
					<Form.Text>
						{isMultiple(saved.Document)
							? MULTIPLE_STR
							: saved.Document}
					</Form.Text>
				)}
			</Col>
		</Form.Group>
	);
}
