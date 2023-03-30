import React from 'react';
import {useAppSelector} from '../store/hooks';

import {Row, Field, ActionIcon, isMultiple} from 'dot11-components';

import {EditTable as Table, TableColumn} from '../components/Table';

import { selectPermissions, Permission } from '../store/permissions';
import type { Member } from '../store/members';

import AccessSelector from './AccessSelector';
import PermissionSelector from './PermissionSelector';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const tableColumns: TableColumn[] = [
	{key: 'scope', label: 'Scope'},
	{key: 'description', label: 'Description'},
	{key: 'actions', label: ''}
];

function MemberPermissions({
	member,
	updateMember,
	readOnly
}: {
	member: Member;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const allPermissions = useAppSelector(selectPermissions);
	const memberPermissions = member.Permissions.map(scope => {
		const p = allPermissions.find(p => p.scope === scope);
		return {scope, description: p? p.description: '(Blank)'};
	});

	function addPermission(scope: string | null) {
		if (!scope)
			return;
		const Permissions = member.Permissions.slice();
		if (!Permissions.includes(scope)) {
			Permissions.push(scope);
			updateMember({Permissions});
		}
	}

	const columns = React.useMemo(() => {

		function deletePermission(scope: string) {
			const Permissions = member.Permissions.filter(memberScope => memberScope !== scope);
			updateMember({Permissions});
		}

		return tableColumns.map(col => {

			let renderCell: ((entry: Permission) => JSX.Element) | undefined;

			if (col.key === 'actions' && !readOnly) {
				renderCell = (entry) => <ActionIcon name='delete' onClick={() => deletePermission(entry.scope)} />
			}

			if (renderCell)
				col = {...col, renderCell};

			return col;
		})
	}, [member.Permissions, updateMember, readOnly]);

	return (
		<>
			<Row>
				<Field label='Access:'>
					<AccessSelector
						style={{flexBasis: 200}}
						value={isMultiple(member.Access)? 0: member.Access}
						onChange={value => updateMember({Access: value})}
						placeholder={isMultiple(member.Access)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Permissions:'>
					<PermissionSelector
						style={{flexBasis: 200}}
						value={null}
						onChange={addPermission}
						placeholder='Add permission scope...'
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Table
				columns={columns}
				values={memberPermissions}
			/>
		</>
	)
}

export default MemberPermissions;
