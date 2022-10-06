import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Button, ActionButton, Input} from  'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	loadWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	selectWebexAccountsState
} from '../store/webexAccounts';

import {GroupSelector} from '../components/GroupSelector';
import TopRow from '../components/TopRow';
import {EditTable as Table} from '../components/Table';

const displayDate = (d) =>
	new Intl.DateTimeFormat('default', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}).format(new Date(d));

const defaultAccount = {
	name: '',
	groups: []
};

const tableColumns = {
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

const selectWebexAccounts = (state) => {
	const {loading, ids, entities} = selectWebexAccountsState(state);
	return {
		loading,
		accounts: ids.map(id => entities[id])
	}
}

function WebexAccounts() {
	const dispatch = useDispatch();
	const {loading, accounts} = useSelector(selectWebexAccounts);
	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(loadWebexAccounts());

	const columns = React.useMemo(() => {
		
		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key !== 'actions');

		const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
		const handleDelete = (id) => dispatch(deleteWebexAccount(id));
		const handleChange = (id, changes) => dispatch(updateWebexAccount(id, changes));

		const columns = keys.map(key => {
			const col = {...tableColumns[key]};
			col.key = key;
			if (key === 'name') {
				col.renderCell = (account) =>
					<Input
						type='search'
						value={account.name}
						onChange={(e) => handleChange(account.id, {name: e.target.value})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'groups') {
				col.renderCell = (account) =>
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
				col.renderCell = (account) =>
					<>
						{account.authDate? displayDate(account.authDate): ''}
						<Button style={{marginLeft: '1em'}} onClick={() => window.location = account.authUrl}>
							{account.authDate? 'Reauthorize': 'Authorize'}
						</Button>
					</>;
			}
			else if (key === 'actions') {
				col.renderCell = (account) => 
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
