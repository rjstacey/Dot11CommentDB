import * as React from "react";
import { DateTime } from "luxon";

import { Col, Checkbox, Input, ActionIcon } from "dot11-components";
import type {
	Member,
	MemberContactEmail,
	MemberContactInfo,
} from "../store/members";
import type { MultipleMember } from "./MemberEdit";

import { EditTable as Table, TableColumn } from "../components/Table";

type ContactInfoFieldType = {
	key: keyof MemberContactInfo;
	label: string;
	size?: number;
};

const contactEmailColumns: TableColumn[] = [
	{ key: "Email", label: "Email" },
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
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const columns = React.useMemo(() => {
		const contactEmails = member.ContactEmails || [];
		const disableAdd =
			contactEmails.length > 0 && contactEmails[0].Email === "";

		function addContactEmail() {
			const id =
				contactEmails.reduce(
					(maxId, h) => (h.id > maxId ? h.id : maxId),
					0
				) + 1;
			const contactEmail: MemberContactEmail = {
				id,
				Email: "",
				Primary: 0,
				Broken: 0,
				DateAdded: DateTime.now().toISO(),
			};
			const ContactEmails = [contactEmail, ...contactEmails];
			updateMember({ ContactEmails });
		}

		function updateContactEmail(
			id: number,
			changes: Partial<MemberContactEmail>
		) {
			const ContactEmails = contactEmails.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			updateMember({ ContactEmails });
		}

		function deleteContactEmail(id: number) {
			const ContactEmails = contactEmails.filter((h) => h.id !== id);
			updateMember({ ContactEmails });
		}

		return contactEmailColumns.map((col) => {
			let renderCell, label;

			if (col.key === "Email") {
				renderCell = (entry: MemberContactEmail) => (
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
				renderCell = (entry: MemberContactEmail) => (
					<Checkbox
						checked={!!entry.Primary}
						onChange={(e) =>
							updateContactEmail(entry.id, {
								Primary: e.target.checked ? 1 : 0,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Broken") {
				renderCell = (entry: MemberContactEmail) => (
					<Checkbox
						checked={!!entry.Broken}
						onChange={(e) =>
							updateContactEmail(entry.id, {
								Broken: e.target.checked ? 1 : 0,
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
				renderCell = (entry: MemberContactEmail) => (
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
	}, [member.ContactEmails, updateMember, readOnly]);

	return (
		<Table
			columns={columns}
			values={member.ContactEmails || []}
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
	member,
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const contactInfo = member.ContactInfo || {};

	const rows = ContactInfoFields.map((f) => (
		<div
			key={f.key}
			style={{display: 'flex', alignItems: 'center'}}
		>
			<label
				style={{fontWeight: 'bold', width: 100}}
			>
				{f.label}
			</label>
			<Input
				type="text"
				size={f.size}
				value={contactInfo[f.key]}
				onChange={(e) =>
					updateMember({
						ContactInfo: {
							...contactInfo,
							[f.key]: e.target.value,
						},
					})
				}
				disabled={readOnly}
			/>
		</div>
	));

	return (
		<Col style={{ marginLeft: 10 }}>
			<MemberContactEmails
				member={member}
				updateMember={updateMember}
				readOnly={readOnly}
			/>
			{rows}
		</Col>
	);
}

export default MemberContactInfoEdit;
