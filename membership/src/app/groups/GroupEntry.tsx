import * as React from "react";
import { Form, Row, Col, Button, Spinner } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	getSubgroupTypes,
	GroupCreate,
	selectGroupEntities,
} from "@/store/groups";
import type { Officer } from "@/store/officers";

import { GroupTypeSelector } from "./GroupTypeSelector";
import { GroupStatusSelector } from "./GroupStatusSelector";
import Officers from "./Officers";
import GroupSelector from "@/components/GroupSelector";
import ImatCommitteeSelector from "./ImatCommitteeSelector";
import ColorPicker from "@/components/ColorPicker";

export type GroupEntry = GroupCreate & { officers: Officer[] };
export type MultipleGroupEntry = Multiple<GroupCreate> & {
	officers: Officer[];
};

export type EditAction = "view" | "update" | "add";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

function checkEntry(entry: MultipleGroupEntry): string | undefined {
	if (!entry.name) return "Set group name";
	if (!entry.parent_id && entry.type !== "r") return "Set group parent";
	if (!entry.type) return "Set group type";
	for (const officer of entry.officers) {
		if (!officer.position) return "Set officer position";
		if (!officer.sapin) return "Select member for officer position";
	}
}

function GroupEntrySubmit({
	action,
	busy,
	submit,
	cancel,
}: {
	action: EditAction;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
}) {
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				{submit && (
					<Button type="submit">
						{busy ? <Spinner animation="border" size="sm" /> : null}
						{action === "add" ? "Add" : "Update"}
					</Button>
				)}
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				{cancel && (
					<Button variant="secondary" onClick={cancel}>
						Cancel
					</Button>
				)}
			</Col>
		</Form.Group>
	);
}

export function GroupEntryForm({
	action,
	entry,
	changeEntry,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: EditAction;
	entry: MultipleGroupEntry;
	changeEntry: (changes: Partial<GroupEntry>) => void;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const [validated, setValidated] = React.useState<boolean | undefined>(
		undefined
	);

	const entities = useAppSelector(selectGroupEntities);

	function change(changes: Partial<GroupEntry>) {
		if ("symbol" in changes && entry.type === "tg") {
			const s = changes.symbol?.split("/");
			changes.project = "P" + (s ? s[s.length - 1] : s);
		}
		if ("parent_id" in changes) {
			const { parent_id } = changes;
			const parentGroup = parent_id ? entities[parent_id] : undefined;
			if (parentGroup) {
				const types = getSubgroupTypes(parentGroup.type!);
				if (
					parentGroup.type !== entry.type &&
					(isMultiple(entry.type) || !types.includes(entry.type!))
				) {
					changes.type = types[0] || null;
				}
			} else {
				changes.type = null;
			}
		}
		changeEntry(changes);
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const errorText = checkEntry(entry);
		if (errorText) {
			setValidated(false);
			return;
		}
		setValidated(true);
		submit?.();
	};

	return (
		<Form
			noValidate
			validated={validated}
			onSubmit={handleSubmit}
			className="p-3"
		>
			<Form.Group as={Row} className="mb-3" controlId="group.parent_id">
				<Form.Label column>Parent group:</Form.Label>
				<Col xs={12} md={8}>
					<GroupSelector
						id="group.parent_id"
						style={{ width: 200 }}
						value={
							isMultiple(entry.parent_id)
								? ""
								: entry.parent_id || ""
						}
						onChange={(parent_id) => change({ parent_id })}
						placeholder={
							isMultiple(entry.parent_id)
								? MULTIPLE_STR
								: "(None)"
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="group.name">
				<Form.Label column>Group Name:</Form.Label>
				<Col xs={12} md={8}>
					<Form.Control
						type="text"
						style={{ maxWidth: 400 }}
						value={isMultiple(entry.name) ? "" : entry.name || ""}
						onChange={(e) => change({ name: e.target.value })}
						placeholder={
							isMultiple(entry.name) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly || entry.type === "r"}
						required
						isInvalid={!entry.name}
					/>
					<Form.Control.Feedback type="invalid">
						Provide a group name
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="group.type">
				<Form.Label column>Group Type:</Form.Label>
				<Col xs={12} md={8}>
					<GroupTypeSelector
						id="group.type"
						style={{ maxWidth: 200 }}
						value={isMultiple(entry.type) ? null : entry.type}
						onChange={(type) => change({ type })}
						parent_id={entry.parent_id}
						placeholder={
							isMultiple(entry.type) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="group.status">
				<Form.Label column>Status:</Form.Label>
				<Col xs={12} md={8}>
					<GroupStatusSelector
						id="group.status"
						style={{ maxWidth: 200 }}
						value={isMultiple(entry.status) ? 1 : entry.status || 0}
						onChange={(status) => change({ status })}
						placeholder={
							isMultiple(entry.status) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span" htmlFor="group.color">
						Color:
					</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<ColorPicker
						id="group.color"
						value={isMultiple(entry.color) ? "" : entry.color || ""}
						onChange={(value) => change({ color: value })}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Col>
			</Form.Group>
			{entry.type === "tg" && (
				<Form.Group as={Row} className="mb-3" controlId="group.project">
					<Form.Label column>Project:</Form.Label>
					<Col xs={12} md={8}>
						<Form.Control
							type="text"
							style={{ maxWidth: 400 }}
							value={
								isMultiple(entry.project)
									? ""
									: entry.project || ""
							}
							onChange={(e) =>
								change({ project: e.target.value })
							}
							placeholder={
								isMultiple(entry.project)
									? MULTIPLE_STR
									: BLANK_STR
							}
							disabled={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
			{entry.type && ["c", "wg", "tg"].includes(entry.type) && (
				<Form.Group as={Row} className="mb-3">
					<Form.Label column htmlFor="group.imat_committee">
						IMAT committee:
					</Form.Label>
					<Col xs={8}>
						<ImatCommitteeSelector
							id="group.imat_committee"
							style={{ maxWidth: 200 }}
							value={
								isMultiple(entry.symbol)
									? ""
									: entry.symbol || ""
							}
							onChange={(symbol) => change({ symbol })}
							type={
								entry.type === "wg"
									? "Working Group"
									: entry.type === "tg"
									? "Project"
									: undefined
							}
							placeholder={
								isMultiple(entry.symbol)
									? MULTIPLE_STR
									: undefined
							}
							readOnly={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
			{!isMultiple(entry.id) && (
				<Officers
					group={entry as GroupCreate}
					readOnly={readOnly}
					officers={entry.officers}
					onChange={(officers) => change({ officers })}
				/>
			)}
			<GroupEntrySubmit
				action={action}
				busy={busy}
				submit={submit}
				cancel={cancel}
			/>
		</Form>
	);
}
