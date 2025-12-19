import { Form, Row, Col, Button } from "react-bootstrap";
import { isMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import type { Session } from "@/store/sessions";
import { selectGroupEntities } from "@/store/groups";
import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/hooks/meetingsEdit";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";
import { SubgroupSelector } from "@/components/SubgroupSelector";
import { MeetingsTimeEdit } from "./MeetingsTimeEdit";
import { MeetingsLocationEdit } from "./MeetingsLocationEdit";

export function MeetingsBasicEdit({
	action,
	entry,
	changeEntry,
	session,
	readOnly,
}: {
	action: "add-by-slot" | "add-by-date" | "update";
	entry: MeetingEntryMultiple;
	session: Session;
	changeEntry: (changes: MeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	const groupEntities = useAppSelector(selectGroupEntities);

	function handleChange(changes: MeetingEntryPartial) {
		changes = { ...changes };
		if ("organizationId" in changes) {
			const subgroup =
				changes.organizationId && groupEntities[changes.organizationId];
			if (subgroup) changes.summary = subgroup.name;
		}
		changeEntry(changes);
	}

	return (
		<>
			{action === "update" && (
				<Form.Group
					as={Row}
					className="mb-3"
					controlId="meeting-cancel"
				>
					<Col className="d-flex justify-content-end align-items-center">
						<Button
							variant="outline-danger"
							active={
								!isMultiple(entry.isCancelled) &&
								entry.isCancelled
							}
							onClick={() =>
								changeEntry({
									isCancelled: !entry.isCancelled,
								})
							}
							disabled={isMultiple(entry.isCancelled) || readOnly}
							title="Mark the meeting as cancelled"
						>
							{entry.isCancelled ? "Cancelled" : "Cancel Meeting"}
						</Button>
					</Col>
				</Form.Group>
			)}
			<Form.Group as={Row} className="mb-3">
				<Form.Label htmlFor="meeting-subgroup" column>
					Subgroup:
				</Form.Label>
				<Col xs="auto">
					<SubgroupSelector
						id="meeting-subgroup"
						style={{ minWidth: 200 }}
						value={
							isMultiple(entry.organizationId)
								? ""
								: entry.organizationId || ""
						}
						onChange={(organizationId) =>
							handleChange({ organizationId })
						}
						placeholder={
							isMultiple(entry.organizationId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						isInvalid={!entry.organizationId}
					/>
					<Form.Control.Feedback type="invalid">
						{"Enter subgroup"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-summary">Summary:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="meeting-summary"
						type="search"
						style={{ width: 200 }}
						value={
							isMultiple(entry.summary) ? "" : entry.summary || ""
						}
						onChange={(e) =>
							handleChange({ summary: e.target.value })
						}
						placeholder={
							isMultiple(entry.summary) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			{action !== "add-by-slot" && (
				<MeetingsTimeEdit
					action={action === "add-by-date" ? "add" : "update"}
					entry={entry}
					session={session}
					changeEntry={handleChange}
					readOnly={readOnly}
				/>
			)}

			{action !== "add-by-slot" && (
				<MeetingsLocationEdit
					entry={entry}
					session={session}
					changeEntry={handleChange}
					readOnly={readOnly}
				/>
			)}
			{!entry.isSessionMeeting && (
				<Form.Group as={Row} className="mb-3">
					<Col>
						<Form.Label htmlFor="meeting-includes-motions">
							Agenda includes motions:
						</Form.Label>
					</Col>
					<Col xs="auto">
						<Form.Check
							id="meeting-includes-motions"
							type="checkbox"
							checked={
								isMultiple(entry.hasMotions)
									? false
									: entry.hasMotions
							}
							ref={(ref) => {
								if (ref)
									ref.indeterminate = isMultiple(
										entry.hasMotions
									);
							}}
							onChange={(e) =>
								handleChange({
									hasMotions: e.target.checked,
								})
							}
							disabled={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
		</>
	);
}
