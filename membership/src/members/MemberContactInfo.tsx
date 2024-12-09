import React from "react";
import { DateTime } from "luxon";

import { Col, Checkbox, Input, ActionIcon } from "dot11-components";
import {
	Member,
	ContactEmail,
	ContactInfo,
	memberContactInfoEmpty,
} from "../store/members";
import { hasChangesStyle, type MultipleMember } from "./MemberEdit";

import { EditTable as Table, TableColumn } from "../components/Table";

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
					<Input
						type="text"
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
					<Checkbox
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
					<Checkbox
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
					<ActionIcon
						name="add"
						disabled={disableAdd}
						onClick={addContactEmail}
					/>
				);
				renderCell = (entry: ContactEmail) => (
					<ActionIcon
						name="delete"
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

function MemberContactInfoEdit({
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
		<div key={f.key} style={{ display: "flex", alignItems: "center" }}>
			<label style={{ fontWeight: "bold", width: 100 }}>{f.label}</label>
			<Input
				style={hasChangesStyle(
					editedContactInfo,
					savedContactInfo,
					f.key
				)}
				type="text"
				size={f.size}
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
			/>
		</div>
	));

	return (
		<Col>
			<MemberContactEmails
				member={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			{contactInfoRows}
		</Col>
	);
}

export default MemberContactInfoEdit;
