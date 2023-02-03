import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {isMultiple} from 'dot11-components/lib';
import {Row, Field} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';

import {selectPermissions} from '../store/permissions';

import AccessSelector from './AccessSelector';
import PermissionSelector from './PermissionSelector';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const tableColumns = [
	{key: 'scope', label: 'Scope'},
	{key: 'description', label: 'Description'},
	{key: 'actions', label: ''}
];

function MemberPermissions({
	member,
	updateMember,
	readOnly
}) {
	const allPermissions = useSelector(selectPermissions);
	const memberPermissions = member.Permissions.map(scope => {
		const p = allPermissions.find(p => p.scope === scope);
		return {scope, description: p? p.description: '(Blank)'};
	});

	function addPermission(scope) {
		const Permissions = member.Permissions.slice();
		if (!Permissions.includes(scope)) {
			Permissions.push(scope);
			updateMember({Permissions});
		}
	}

	const columns = React.useMemo(() => {

		function deletePermission(scope) {
			const Permissions = member.Permissions.filter(memberScope => memberScope !== scope);
			updateMember({Permissions});
		}

		return tableColumns.map(col => {

			let renderCell;

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
						value={isMultiple(member.Access)? null: member.Access}
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

MemberPermissions.propTypes = {
	member: PropTypes.object.isRequired,
	updateMember: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default MemberPermissions;
