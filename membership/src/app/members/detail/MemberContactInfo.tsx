import * as React from "react";
import {
	Container,
	Row,
	Col,
	FormCheck,
	FormControl,
	FormLabel,
	FormGroup,
	Button,
} from "react-bootstrap";
import { DateTime } from "luxon";

import {
	Member,
	ContactEmail,
	ContactInfo,
	memberContactInfoEmpty,
} from "@/store/members";
import { hasChangesStyle } from "../utils";
import { EditTable as Table, TableColumn } from "@/components/Table";

import type { MultipleMember } from "./MemberEdit";

type ContactInfoFieldType = {
	key: keyof ContactInfo;
	label: string;
	size?: number;
};

const contactEmailColumns: TableColumn[] = [
	{ key: "Email", label: <b>Email</b> },
	{
		key: "Primary",
		label: "Primary",
		styleCell: { justifyContent: "center" },
	},
	{ key: "Broken", label: "Broke", styleCell: { justifyContent: "center" } },
	{
		key: "DateAdded",
		label: "Date added",
		renderCell: (entry) =>
			DateTime.fromISO(entry.DateAdded).toLocaleString(DateTime.DATE_MED),
	},
	{
		key: "actions",
		label: "",
		styleCell: { justifyContent: "space-around" },
	},
];

function MemberContactEmails({
	member,
	saved,
	onChange,
	readOnly,
}: {
	member: MultipleMember;
	saved?: MultipleMember;
	onChange: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const contactEmails = member.ContactEmails;

	const columns = React.useMemo(() => {
		const disableAdd =
			contactEmails.length > 0 && contactEmails[0].Email === "";

		function addContactEmail() {
			const id =
				contactEmails.reduce(
					(maxId, h) => (h.id > maxId ? h.id : maxId),
					0
				) + 1;
			const contactEmail: ContactEmail = {
				id,
				Email: "",
				Primary: false,
				Broken: false,
				DateAdded: DateTime.now().toISO(),
			};
			const ContactEmails = [contactEmail, ...contactEmails];
			onChange({ ContactEmails });
		}

		function updateContactEmail(
			id: number,
			changes: Partial<ContactEmail>
		) {
			const ContactEmails = contactEmails.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			onChange({ ContactEmails });
		}

		function deleteContactEmail(id: number) {
			const ContactEmails = contactEmails.filter((h) => h.id !== id);
			onChange({ ContactEmails });
		}

		return contactEmailColumns.map((col) => {
			let renderCell, label;

			if (col.key === "Email") {
				renderCell = (entry: ContactEmail) => (
					<FormControl
						type="text"
						id={col.key + entry.id}
						style={{ width: "100%" }}
						value={entry.Email}
						onChange={(e) =>
							updateContactEmail(entry.id, {
								Email: e.target.value,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Primary") {
				renderCell = (entry: ContactEmail) => (
					<FormCheck
						id={col.key + entry.id}
						checked={!!entry.Primary}
						onChange={(e) =>
							updateContactEmail(entry.id, {
								Primary: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Broken") {
				renderCell = (entry: ContactEmail) => (
					<FormCheck
						id={col.key + entry.id}
						checked={!!entry.Broken}
						onChange={(e) =>
							updateContactEmail(entry.id, {
								Broken: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "actions" && !readOnly) {
				label = (
					<Button
						name="add"
						variant="outline-primary"
						className="bi-plus-lg"
						disabled={disableAdd}
						onClick={addContactEmail}
					/>
				);
				renderCell = (entry: ContactEmail) => (
					<Button
						name="delete"
						variant="outline-danger"
						className="bi-trash"
						onClick={() => deleteContactEmail(entry.id)}
					/>
				);
			}

			if (renderCell) col = { ...col, renderCell };

			if (label) col = { ...col, label };

			return col;
		});
	}, [contactEmails, onChange, readOnly]);

	return (
		<Table
			style={hasChangesStyle(member, saved, "ContactEmails")}
			columns={columns}
			values={contactEmails}
			rowId="id"
		/>
	);
}

const ContactInfoFields: ContactInfoFieldType[] = [
	{ key: "StreetLine1", label: "Street", size: 36 },
	{ key: "StreetLine2", label: "", size: 36 },
	{ key: "City", label: "City", size: 20 },
	{ key: "State", label: "State", size: 20 },
	{ key: "Zip", label: "Zip/Code" },
	{ key: "Country", label: "Country" },
	{ key: "Phone", label: "Phone" },
];

export function MemberContactInfo({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: MultipleMember;
	saved?: MultipleMember;
	onChange: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const editedContactInfo = edited.ContactInfo || memberContactInfoEmpty;
	const savedContactInfo = saved?.ContactInfo;

	const contactInfoRows = ContactInfoFields.map((f) => (
		<FormGroup
			as={Row}
			key={f.key}
			controlId={f.key}
			className="d-flex align-items-center mb-3"
		>
			<FormLabel column xs={4} style={{ fontWeight: "bold", width: 100 }}>
				{f.label}
			</FormLabel>
			<Col xs={8}>
				<FormControl
					type="text"
					style={hasChangesStyle(
						editedContactInfo,
						savedContactInfo || undefined,
						f.key
					)}
					//size={f.size}
					value={editedContactInfo[f.key]}
					onChange={(e) =>
						onChange({
							ContactInfo: {
								...editedContactInfo,
								[f.key]: e.target.value,
							},
						})
					}
					disabled={readOnly}
					autoComplete="none"
				/>
			</Col>
		</FormGroup>
	));

	return (
		<Container fluid>
			<MemberContactEmails
				member={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			{contactInfoRows}
		</Container>
	);
}
