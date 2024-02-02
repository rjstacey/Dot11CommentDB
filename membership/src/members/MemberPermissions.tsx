import * as React from "react";

import { Row, Field, ActionIcon, isMultiple } from "dot11-components";

import { EditTable as Table, TableColumn } from "../components/Table";

import type { Permission } from "../store/permissions";
import type { Member } from "../store/members";
import type { MultipleMember } from "./MemberDetail";

import AccessSelector from "./AccessSelector";
import PermissionSelector from "./PermissionSelector";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

const tableColumns: TableColumn[] = [
	{ key: "scope", label: "Scope" },
	{ key: "description", label: "Description" },
	{ key: "actions", label: "" },
];

function MemberPermissions({
	member,
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const memberPermissions =
		member.Permissions && !isMultiple(member.Permissions)
			? member.Permissions
			: [];

	function addPermission(scope: string | null) {
		if (!scope) return;
		const Permissions = memberPermissions.slice();
		if (!Permissions.includes(scope)) {
			Permissions.push(scope);
			updateMember({ Permissions });
		}
	}

	const columns = React.useMemo(() => {
		function deletePermission(scope: string) {
			const Permissions = memberPermissions.filter(
				(memberScope) => memberScope !== scope
			);
			updateMember({ Permissions });
		}

		return tableColumns.map((col) => {
			let renderCell: ((entry: Permission) => JSX.Element) | undefined;

			if (col.key === "actions" && !readOnly) {
				renderCell = (entry) => (
					<ActionIcon
						name="delete"
						onClick={() => deletePermission(entry.scope)}
					/>
				);
			}

			if (renderCell) col = { ...col, renderCell };

			return col;
		});
	}, [memberPermissions, updateMember, readOnly]);

	return (
		<>
			<Row>
				<Field label="Access:">
					<AccessSelector
						style={{ flexBasis: 200 }}
						value={isMultiple(member.Access) ? 0 : member.Access}
						onChange={(value) => updateMember({ Access: value })}
						placeholder={
							isMultiple(member.Access) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Permissions:">
					<PermissionSelector
						style={{ flexBasis: 200 }}
						value={null}
						onChange={addPermission}
						placeholder="Add permission scope..."
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Table columns={columns} values={memberPermissions} />
		</>
	);
}

export default MemberPermissions;
