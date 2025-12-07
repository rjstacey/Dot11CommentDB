import * as React from "react";
import { Table, Row, Col, Form } from "react-bootstrap";
import { DateTime } from "luxon";

import { isMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	MemberCreate,
	selectMemberEntities,
	type Member,
	type MemberChange,
} from "@/store/members";
import type { MultipleMember } from "@/edit/membersEdit";

import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";
import { hasChangesStyle } from "@/components/utils";

import { MemberAllSelector } from "./MemberAllSelector";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function ShortMemberSummary({ sapins }: { sapins: number[] }) {
	const members = useAppSelector(selectMemberEntities);

	const rows = sapins.map((sapin) => {
		const m = members[sapin];
		if (!m) return null;
		return (
			<tr key={m.SAPIN}>
				<td>{m.SAPIN}</td>
				<td>{m.Name}</td>
				<td>{m.Email}</td>
				<td>{m.Affiliation}</td>
				<td>{m.Status}</td>
				<td>{m.DateAdded ? displayDate(m.DateAdded) : "-"}</td>
			</tr>
		);
	});
	return (
		<Table size="sm" borderless responsive>
			<tbody>{rows}</tbody>
		</Table>
	);
}

const renderDate = (value: string | null | undefined) =>
	isMultiple(value) ? (
		<i>{MULTIPLE_STR}</i>
	) : value ? (
		displayDate(value)
	) : (
		<i>{BLANK_STR}</i>
	);

function ExpandingInput({
	dataKey,
	edited,
	saved,
	onChange,
	invalidFeedback,
	...props
}: {
	dataKey: keyof Omit<
		MemberCreate,
		| "ContactInfo"
		| "ContactEmails"
		| "ObsoleteSAPINs"
		| "StatusChangeHistory"
	>;
	edited: MultipleMember | MemberCreate;
	saved?: MultipleMember;
	onChange: (changes: MemberChange) => void;
	invalidFeedback?: string;
} & React.ComponentProps<typeof Form.Control>) {
	const value = "" + edited[dataKey];
	const savedValue: string | number | boolean | null | undefined =
		saved?.[dataKey] || "";
	return (
		<Col className="d-flex flex-column">
			<Form.Control
				{...props}
				type="text"
				style={{
					...hasChangesStyle(edited, saved, dataKey),
					//width: `${Math.max(value.length + 3, 22)}ch`,
					alignSelf: "flex-end",
				}}
				name={dataKey}
				value={isMultiple(value) ? "" : value}
				onChange={(e) => onChange({ [dataKey]: e.target.value })}
				placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
			/>
			{invalidFeedback && (
				<Form.Control.Feedback type="invalid">
					{invalidFeedback}
				</Form.Control.Feedback>
			)}
			<Form.Text className="text-muted">{savedValue}</Form.Text>
		</Col>
	);
}

export const emailPattern =
	"[A-Za-z0-9.\\-_%+]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}";

export function MemberBasicEdit({
	sapins,
	edited,
	saved,
	onChange,
	readOnly,
	basicOnly,
}: {
	sapins: number[];
	edited: MultipleMember | MemberCreate;
	saved?: MultipleMember;
	onChange: (changes: Partial<Member>) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	function change(changes: Partial<Member>) {
		const name =
			edited.FirstName +
			(edited.MI ? ` ${edited.MI} ` : " ") +
			edited.LastName;
		if (
			("LastName" in changes ||
				"FirstName" in changes ||
				"MI" in changes) &&
			edited.Name === name
		) {
			const LastName =
				"LastName" in changes ? changes.LastName : edited.LastName;
			const MI = "MI" in changes ? changes.MI : edited.MI;
			const FirstName =
				"FirstName" in changes ? changes.FirstName : edited.FirstName;
			changes.Name = FirstName + (MI ? ` ${MI} ` : " ") + LastName;
		}
		onChange(changes);
	}

	const hasMany = sapins.length > 1;
	let sapinEl: JSX.Element;
	if (hasMany) {
		sapinEl = (
			<>
				<Form.Label as="span" column xs={4}>
					SA PINs:
				</Form.Label>
				<Col>
					<span>{sapins.join(", ")}</span>
				</Col>
			</>
		);
	} else {
		sapinEl = (
			<>
				<Form.Label column xs={4}>
					SA PIN:
				</Form.Label>
				<Col>
					<Form.Control
						type="text"
						value={edited.SAPIN || ""}
						onChange={(e) =>
							change({ SAPIN: Number(e.target.value) })
						}
						pattern="\d+"
						disabled={basicOnly || readOnly}
						autoComplete="none"
						required
					/>
					<Form.Control.Feedback type="invalid">
						SA PIN not set
					</Form.Control.Feedback>
				</Col>
			</>
		);
	}

	let editedForUpdate: MultipleMember | undefined;
	if (Object.prototype.hasOwnProperty.call(edited, "ReplacedBySAPIN")) {
		editedForUpdate = edited as MultipleMember;
	}

	return (
		<>
			<Row className="mb-3">
				<Form.Group
					as={Col}
					xs={5}
					controlId="sapin"
					className="d-flex align-items-center"
				>
					{sapinEl}
				</Form.Group>
				<Form.Group
					as={Col}
					xs={7}
					controlId="dateAdded"
					className="d-flex align-items-center"
				>
					<Col>
						<Form.Label as="span">Date added:</Form.Label>
					</Col>
					<Col>
						<Form.Control as="div">
							{renderDate(edited.DateAdded)}
						</Form.Control>
					</Col>
				</Form.Group>
			</Row>
			<Form.Group as={Row} controlId="name" className="mb-3">
				<Form.Label column xs={3}>
					Name:
				</Form.Label>
				<ExpandingInput
					dataKey="Name"
					edited={edited}
					saved={saved}
					onChange={change}
					disabled={readOnly}
					autoComplete="none"
				/>
			</Form.Group>
			<Form.Group as={Row} controlId="familyName" className="mb-3">
				<Form.Label column xs={3}>
					Family name:
				</Form.Label>
				<ExpandingInput
					dataKey="LastName"
					edited={edited}
					saved={saved}
					onChange={change}
					disabled={readOnly}
					autoComplete="none"
					required
					invalidFeedback="Family name not set"
				/>
			</Form.Group>
			<Row className="mb-3">
				<Form.Group
					as={Col}
					xs={8}
					controlId="givenName"
					className="d-flex"
				>
					<Form.Label column xs={5}>
						Given name:
					</Form.Label>
					<ExpandingInput
						dataKey="FirstName"
						edited={edited}
						saved={saved}
						onChange={change}
						disabled={readOnly}
						autoComplete="none"
						required
						invalidFeedback="Given name not set"
					/>
				</Form.Group>
				<Form.Group as={Col} xs={4} controlId="mi" className="d-flex">
					<Form.Label column xs={3}>
						MI:
					</Form.Label>
					<ExpandingInput
						dataKey="MI"
						edited={edited}
						saved={saved}
						onChange={change}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Form.Group>
			</Row>
			<Form.Group as={Row} controlId="email" className="mb-3">
				<Form.Label column xs={2}>
					Email:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Email"
						edited={edited}
						saved={saved}
						onChange={change}
						disabled={readOnly}
						pattern={emailPattern}
						autoComplete="none"
						required
						invalidFeedback="Invalid email address"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="employer" className="mb-3">
				<Form.Label column xs={3}>
					Employer:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Employer"
						edited={edited}
						saved={saved}
						onChange={change}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="affiliation" className="mb-3">
				<Form.Label column xs={3}>
					Affiliation:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Affiliation"
						edited={edited}
						saved={saved}
						onChange={change}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			{editedForUpdate && editedForUpdate.Status === "Obsolete" && (
				<Form.Group as={Row}>
					<Form.Label column>Replaced by:</Form.Label>
					<Col>
						<MemberAllSelector
							style={{ maxWidth: 400, flex: 1 }}
							value={
								isMultiple(editedForUpdate.ReplacedBySAPIN)
									? null
									: editedForUpdate.ReplacedBySAPIN || null
							}
							onChange={(value) =>
								change({
									ReplacedBySAPIN: value || undefined,
								})
							}
							placeholder={
								isMultiple(editedForUpdate.ReplacedBySAPIN)
									? MULTIPLE_STR
									: BLANK_STR
							}
							readOnly={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
			{!hasMany &&
				editedForUpdate &&
				!isMultiple(editedForUpdate.ObsoleteSAPINs) &&
				editedForUpdate.ObsoleteSAPINs.length > 0 && (
					<Row>
						<Col>
							<Form.Label as="span">Replaces:</Form.Label>
							<ShortMemberSummary
								sapins={editedForUpdate.ObsoleteSAPINs}
							/>
						</Col>
					</Row>
				)}
		</>
	);
}
