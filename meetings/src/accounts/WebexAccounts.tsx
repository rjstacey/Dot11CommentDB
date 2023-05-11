import React from 'react';

import { Button, ActionButton, Input, ActionIcon } from  'dot11-components';

import type { RootState } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	loadWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	selectWebexAccountsState,
	WebexAccount,
	WebexAccountCreate
} from '../store/webexAccounts';

import { GroupSelector } from '../components/GroupSelector';
import TopRow from '../components/TopRow';
import { EditTable as Table, TableColumn } from '../components/Table';

const displayDate = (d: string) =>
	new Intl.DateTimeFormat('default', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}).format(new Date(d));

const defaultAccount: WebexAccountCreate = {
	name: '',
	groups: []
};

const tableColumns: { [key: string]: Omit<TableColumn, "key">} = {
	name: {
		label: 'Name',
		gridTemplate: 'minmax(200px, auto)'
	},
	groups: {
		label: 'Groups',
		gridTemplate: 'minmax(200px, auto)'
	},
	authorized: {
		label: 'Last authorized',
		gridTemplate: 'minmax(300px, 1fr)'
	},
	actions: {
		label: '',
		gridTemplate: '40px'
	}
};

const selectWebexAccounts = (state: RootState) => {
	const {loading, ids, entities} = selectWebexAccountsState(state);
	return {
		loading,
		accounts: ids.map(id => entities[id])
	}
}

function WebexAccounts() {
	const dispatch = useAppDispatch();
	const {loading, accounts} = useAppSelector(selectWebexAccounts);
	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(loadWebexAccounts());

	const columns = React.useMemo(() => {
		
		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key !== 'actions');

		const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
		const handleDelete = (id: number) => dispatch(deleteWebexAccount(id));
		const handleChange = (id: number, changes: Partial<WebexAccount>) => dispatch(updateWebexAccount(id, changes));

		const columns = keys.map(key => {
			const col: TableColumn = {
				key,
				...tableColumns[key]
			};
			if (key === 'name') {
				col.renderCell = (account: WebexAccount) =>
					<Input
						type='search'
						value={account.name}
						onChange={(e) => handleChange(account.id, {name: e.target.value})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'groups') {
				col.renderCell = (account: WebexAccount) =>
					<GroupSelector
						multi
						value={account.groups}
						onChange={groups => handleChange(account.id, {groups})}
						types={['wg', 'c']}
						portal={document.querySelector('#root')}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'authorized') {
				col.renderCell = (account: WebexAccount) =>
					<>
						{account.authDate? displayDate(account.authDate): ''}
						<Button style={{marginLeft: '1em'}} onClick={() => window.location.href = account.authUrl}>
							{account.authDate? 'Reauthorize': 'Authorize'}
						</Button>
					</>;
			}
			else if (key === 'actions') {
				col.renderCell = (account: WebexAccount) => 
					<ActionIcon type='delete' onClick={() => handleDelete(account.id)} />
				col.label = 
					<ActionIcon type='add' onClick={handleAdd} />
			}
			return col;
		});

		return columns;
	}, [dispatch, readOnly]);

	return (
		<>
			<TopRow>
				<h3>Webex accounts</h3>
				<div style={{display: 'flex'}}>
					<ActionButton name='edit' title='Edit' isActive={!readOnly} onClick={() => setReadOnly(!readOnly)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
				</div>
			</TopRow>
			<Table
				values={accounts}
				columns={columns}
			/>
		</>
	)
}

export default WebexAccounts;
