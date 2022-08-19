import React from 'react';
import {Redirect} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';

import {Button, ActionButton, Input} from  'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	loadCalendarAccounts,
	updateCalendarAccount,
	addCalendarAccount,
	deleteCalendarAccount,
	completeAuthCalendarAccount,
	revokeAuthCalendarAccount,
	selectCalendarAccountsState
} from '../store/calendarAccounts';

import {GroupSelector} from '../components/GroupSelector';
import TopRow from '../components/TopRow';
import {Table, TableBodyEmpty} from './AccountsTable';

const displayDate = (d) =>
	new Intl.DateTimeFormat('default', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}).format(new Date(d));

export function CalendarAccountAuth(props) {
	const dispatch = useDispatch();

	React.useEffect(() => {
		const params = Object.fromEntries(new URLSearchParams(props.location.search));
		dispatch(completeAuthCalendarAccount(params));
	}, [dispatch, props]);

	return <Redirect to="/accounts" />
}

const defaultAccount = {
	name: '',
	groups: []
};

function CalendarAccountsTableHeader({readOnly}) {
	const dispatch = useDispatch();
	const handleAdd = () => dispatch(addCalendarAccount(defaultAccount));
	const header = [
		'Name',
		'Groups',
		'Last authorized',
	];
	if (!readOnly)
		header.push(<ActionIcon type='add' title='Add account' onClick={handleAdd} />);

	return (
		<thead>
			<tr>
				{header.map((element, i) => <th key={i}>{element}</th>)}
			</tr>
		</thead>
	);
}

function CalendarAccountsTableRow({account, readOnly}) {
	const dispatch = useDispatch();
	const handleDelete = () => dispatch(deleteCalendarAccount(account.id));
	const handleChange = (changes) => dispatch(updateCalendarAccount(account.id, changes));

	const row = [
		<Input 
			type='text'
			value={account.name}
			onChange={e => handleChange({name: e.target.value})}
			readOnly={readOnly}
		/>,
		<GroupSelector
			multi
			value={account.groups}
			onChange={groups => handleChange({groups})}
			types={['wg', 'c']}
			portal={document.querySelector('#root')}
			readOnly={readOnly}
		/>,
		<>
			{account.authDate? displayDate(account.authDate): ''}
			{account.authUrl &&
				<Button style={{marginLeft: '1em'}} onClick={() => window.location = account.authUrl}>
					{account.authDate? 'Reauthorize': 'Authorize'}
				</Button>}
			{account.authDate &&
				<Button style={{marginLeft: '1em'}} onClick={() => dispatch(revokeAuthCalendarAccount(account.id))}>
					{'Revoke'}
				</Button>}
		</>
	];

	if (!readOnly)
		row.push(<ActionIcon type='delete' onClick={handleDelete}/>);

	return (
		<tr>
			{row.map((element, i) => <td key={i}>{element}</td>)}
		</tr>
	)
}

const CalendarAccountsTable = ({accounts, readOnly}) => 
	<Table>
		<CalendarAccountsTableHeader readOnly={readOnly} />
		<tbody>
			{accounts.length > 0?
				accounts.map(account => <CalendarAccountsTableRow key={account.id} account={account} readOnly={readOnly} />):
				<TableBodyEmpty />}
		</tbody>
	</Table>

const selectCalendarAccounts = (state) => {
	const {loading, ids, entities} = selectCalendarAccountsState(state);
	return {
		loading,
		accounts: ids.map(id => entities[id])
	}
}

function CalendarAccounts() {
	const dispatch = useDispatch();
	const {loading, accounts} = useSelector(selectCalendarAccounts);
	const [edit, setEdit] = React.useState(false);
	const refresh = () => dispatch(loadCalendarAccounts());

	return (
		<>
			<TopRow>
				<h3>Calendar accounts</h3>
				<div style={{display: 'flex'}}>
					<ActionButton name='edit' title='Edit' isActive={edit} onClick={() => setEdit(!edit)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
				</div>
			</TopRow>
			<CalendarAccountsTable
				accounts={accounts}
				readOnly={!edit}
			/>
		</>
	)
}

export default CalendarAccounts;
