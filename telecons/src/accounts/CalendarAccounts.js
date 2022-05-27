import React from 'react';
import {Redirect} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {ActionButton, Input} from  'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';
import {displayDate} from 'dot11-components/lib';

import {loadCalendarAccounts, updateCalendarAccount, addCalendarAccount, deleteCalendarAccount, authCalendarAccount, selectCalendarAccountsState} from '../store/calendarAccounts';
import GroupsSelector from '../organization/GroupSelector';

/* Generate URL for account authorization */
const getCalendarAccountAuthLink = (account) => {
	const {id, auth_url, auth_params} = account;
	const params = {
		...auth_params,
		redirect_uri: window.location.origin + '/telecons/calendar/auth',
		state: id
	};
	return auth_url + '?' + new URLSearchParams(params);
}

export function CalendarAccountAuth(props) {
	const dispatch = useDispatch();
	const query = new URLSearchParams(props.location.search);
	const code = query.get('code');
	const id = query.get('state');
	const redirect_url = window.location.origin + window.location.pathname;

	React.useEffect(() => dispatch(authCalendarAccount(id, code, redirect_url)), [dispatch, id, code, redirect_url]);

	return <Redirect to="/accounts" />
}

// The top row height is determined by its content
const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const Table = styled.table`
	display: grid;
	grid-template-columns: minmax(200px, auto) minmax(200px, auto) minmax(300px, 1fr) 40px;
	border-spacing: 1px;

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		padding: 10px;
		border: gray solid 1px;
		vertical-align: top;
	}

	th:first-of-type, td:first-of-type {
		grid-column: 1;
	}

	tr:first-of-type td {
		border-top: none;
	}

	tr:not(:last-of-type) td {
		border-bottom: none;
	}

	th:not(:last-of-type),
	td:not(:last-of-type) {
		border-right: none;
	}

	th {
		background: #f6f6f6;
		text-align: left;
		font-weight: bold;
		font-size: 1rem;
	}

	td {
		padding-top: 5px;
		padding-bottom: 5px;
	}

	td.empty {
		grid-column: 1 / -1;
		colspan: 0;
		color: gray;
		font-style: italic;
	}

	tr:nth-of-type(even) td {
		background: #fafafa;
	}
`;

const defaultAccount = {
	name: '',
	groups: []
};

function CalendarAccountsTableHeader({readOnly}) {
	const dispatch = useDispatch();
	const handleAdd = () => dispatch(addCalendarAccount(defaultAccount));
	const headerColumns = [
		'Name',
		'Groups',
		'Last authorized',
	];
	if (!readOnly)
		headerColumns.push(<ActionIcon type='add' title='Add account' onClick={handleAdd} />);

	return (
		<thead>
			<tr>
				{headerColumns.map((element, i) => <th key={i}>{element}</th>)}
			</tr>
		</thead>
	);
}

function CalendarAccountsTableRow({account, readOnly}) {
	const dispatch = useDispatch();
	const handleDelete = () => dispatch(deleteCalendarAccount(account.id));
	const handleChange = (changes) => dispatch(updateCalendarAccount(account.id, changes));

	const rowColumns = [
		<Input 
			type='text'
			value={account.name}
			onChange={e => handleChange({name: e.target.value})}
			readOnly={readOnly}
		/>,
		<GroupsSelector
			multi
			value={account.groups}
			onChange={groups => handleChange({groups})}
			types={['wg', 'c']}
			portal={document.querySelector('#root')}
			readOnly={readOnly}
		/>,
		<>
			{account.authDate? displayDate(account.authDate): ''}
			<a style={{padding: '0 1em'}} href={getCalendarAccountAuthLink(account)}>
				{account.authDate? 'Reauthorize': 'Authorize'}
			</a>
		</>
	];

	if (!readOnly)
		rowColumns.push(<ActionIcon type='delete' onClick={handleDelete}/>);

	return (
		<tr>
			{rowColumns.map((element, i) => <td key={i}>{element}</td>)}
		</tr>
	)
}

const CalendarAccountsTableEmpty = () => 
	<tr>
		<td className='empty'>Empty</td>
	</tr>

const CalendarAccountsTable = ({accounts, readOnly}) => 
	<Table>
		<CalendarAccountsTableHeader readOnly={readOnly} />
		<tbody>
			{accounts.length > 0?
				accounts.map(account => <CalendarAccountsTableRow key={account.id} account={account} readOnly={readOnly} />):
				<CalendarAccountsTableEmpty />}
		</tbody>
	</Table>

function CalendarAccounts() {
	const dispatch = useDispatch();
	const {loading, ids, entities} = useSelector(selectCalendarAccountsState);
	const [edit, setEdit] = React.useState(false);
	const refresh = () => dispatch(loadCalendarAccounts());

	React.useEffect(() => {
		if (!loading)
			refresh();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
				accounts={ids.map(id => entities[id])}
				readOnly={!edit}
			/>
		</>
	)
}

export default CalendarAccounts;
