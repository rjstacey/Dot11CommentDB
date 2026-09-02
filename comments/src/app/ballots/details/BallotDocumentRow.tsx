import { Row, Form } from "react-bootstrap";
import cx from "clsx"
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
	const hasChanges1 = saved && saved.Document !== edited.Document;
	const hasChanges2 = saved && saved.DocLink !== edited.DocLink;
	return (
		<>
			<Form.Group as={Row} controlId="ballot-document" className="justify-content-between align-items-center mb-2">
				<Form.Label style={{ width: "fit-content" }}>Document version:</Form.Label>
				<div style={{ width: "fit-content" }}>
					<Form.Control
						type="search"
						style={{ width: "unset" }}
						className={cx("input-fit-content", hasChanges1 && "has-changes")}
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
					{hasChanges1 && (
						<Form.Text>
							{isMultiple(saved.Document)
								? MULTIPLE_STR
								: saved.Document}
						</Form.Text>
					)}
				</div>
			</Form.Group>
			<Form.Group as={Row} controlId="ballot-doc-link" className="justify-content-between align-items-center mb-2">
				<Form.Label style={{ width: "fit-content" }}>Document link:</Form.Label>
				<div style={{ width: "fit-content" }}>
					<Form.Control
						type="url"
						style={{ width: "unset" }}
						className={cx("input-fit-content", hasChanges2 && "has-changes")}
						name="DocLink"
						value={(isMultiple(edited.DocLink) ? "" : edited.DocLink) || ""}
						placeholder={
							isMultiple(edited.DocLink) ? MULTIPLE_STR : BLANK_STR
						}
						onChange={(e) =>
							onChange({ [e.target.name]: e.target.value })
						}
						readOnly={readOnly}
					/>
					{hasChanges2 && (
						<Form.Text>
							{isMultiple(saved.DocLink)
								? MULTIPLE_STR
								: saved.DocLink}
						</Form.Text>
					)}
				</div>
			</Form.Group>
		</>
	);
}
