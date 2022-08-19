import React from 'react';
import {Redirect} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';

import {Button, ActionButton, Input} from  'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	loadWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	completeAuthWebexAccount,
	selectWebexAccountsState
} from '../store/webexAccounts';

import {GroupSelector} from '../components/GroupSelector';
import TopRow from '../components/TopRow';
import {Table, TableBodyEmpty} from './AccountsTable';

const displayDate = (d) =>
	new Intl.DateTimeFormat('default', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}).format(new Date(d));

/* Following auth, the user is redirected to redirect_uri, which renders this component */
export function WebexAccountAuth(props) {
	const dispatch = useDispatch();

	React.useEffect(() => {
		const params = Object.fromEntries(new URLSearchParams(props.location.search));
		dispatch(completeAuthWebexAccount(params));
	}, [dispatch, props]);

	return <Redirect to="/accounts" />
}

const defaultAccount = {
	name: '',
	groups: []
};

function WebexAccountsTableHeader({readOnly}) {
	const dispatch = useDispatch();
	const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
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

function WebexAccountsTableRow({account, readOnly}) {
	const dispatch = useDispatch();
	const handleDelete = () => dispatch(deleteWebexAccount(account.id));
	const handleChange = (changes) => dispatch(updateWebexAccount(account.id, changes));

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
			<Button style={{marginLeft: '1em'}} onClick={() => window.location = account.authUrl}>
				{account.authDate? 'Reauthorize': 'Authorize'}
			</Button>
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

const WebexAccountsTable = ({accounts, readOnly}) => 
	<Table>
		<WebexAccountsTableHeader readOnly={readOnly} />
		<tbody>
			{accounts.length > 0?
				accounts.map(account => <WebexAccountsTableRow key={account.id} account={account} readOnly={readOnly} />):
				<TableBodyEmpty />}
		</tbody>
	</Table>

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
	const [edit, setEdit] = React.useState(false);
	const refresh = () => dispatch(loadWebexAccounts());

	return (
		<>
			<TopRow>
				<h3>Webex accounts</h3>
				<div style={{display: 'flex'}}>
					<ActionButton name='edit' title='Edit' isActive={edit} onClick={() => setEdit(!edit)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
				</div>
			</TopRow>
			<WebexAccountsTable
				accounts={accounts}
				readOnly={!edit}
			/>
		</>
	)
}

export default WebexAccounts;
