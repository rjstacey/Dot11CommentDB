import React from 'react';
import {Redirect} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {ActionButton, Form, Field, Row, Input} from  'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import {shallowDiff, displayDate} from 'dot11-components/lib';

import {loadWebexAccounts, updateWebexAccount, addWebexAccount, deleteWebexAccount, authWebexAccount, dataSet} from '../store/webexAccounts';
import GroupsSelector from './GroupsSelector';

/* Generate URL for account authorization */
const getWebexAccountAuthLink = (account) => {
	const {id, auth_url, auth_params} = account;
	const params = {
		...auth_params,
		redirect_uri: window.location.origin + '/telecons/webex/auth',
		state: id,
	}
	return auth_url + '?' + new URLSearchParams(params);
}

/* Following auth, the user is redirected to redirect_uri above, which renders this component */
export function WebexAccountAuth(props) {
	const dispatch = useDispatch();
	const query = new URLSearchParams(props.location.search);
	const code = query.get('code');
	const id = query.get('state');
	const redirect_url = window.location.origin + window.location.pathname;

	React.useEffect(() => dispatch(authWebexAccount(id, code, redirect_url)), [dispatch, id, code, redirect_url]);

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

function WebexAccountHeader() {
	return (
		<div style={{display: 'flex'}}>
			<div style={{flex: '0 0 200px'}}>Name</div>
			<div style={{flex: '0 0 200px'}}>Groups</div>
			<div style={{flex: '0 0 300px'}}>Last authorized</div>
		</div>
	)
}

function WebexAccountRow({account}) {
	const dispatch = useDispatch();
	const onDelete = (id) => dispatch(deleteWebexAccount(id));

	const groups = account.groups? account.groups.join(', '): '';
	const lastAuth = account.authDate? displayDate(account.authDate): '';

	return (
		<div style={{display: 'flex'}}>
			<div style={{flex: '0 0 200px'}}>{account.name}</div>
			<div style={{flex: '0 0 200px'}}>{groups}</div>
			<div style={{flex: '0 0 300px'}}>
				{lastAuth}
				<a style={{padding: '0 1em'}} href={getWebexAccountAuthLink(account)}>{account.authDate? 'Reauthorize': 'Authorize'}</a>
			</div>
			<div style={{flex: '0 0 200px', display: 'flex'}}>
				<ActionButtonDropdown
					name='edit'
					title='Update account'
					dropdownRenderer={(props) => <WebexAccountAddEdit type='edit' defaultValue={account} {...props} />}
				/>
				<ActionButton name='delete' onClick={() => onDelete(account.id)} />
			</div>

		</div>
	)
}

const defaultAccount = {
	name: '',
};

function WebexAccountAddEdit({close, type, defaultValue}) {
	const [account, setAccount] = React.useState(defaultValue || defaultAccount);
	const dispatch = useDispatch();

	const submit = async () => {
		await dispatch(type === 'add'?
			addWebexAccount(account):
			updateWebexAccount(account.id, shallowDiff(defaultValue, account))
		);
		close();
	};

	const change = e => {
		const {name, value} = e.target;
		setAccount(account => ({...account, [name]: value}));
	}

	return (
		<Form
			title={(type === 'add'? 'Add': 'Update') + ' Webex account'}
			submitLabel={type === 'add'? 'Add': 'Update'}
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field
					label='Name:'
				>
					<Input
						type='search'
						name='name'
						value={account.name}
						onChange={change}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label='Groups:'
				>
					<GroupsSelector
						portal={document.querySelector('#root')}
						value={account.groups}
						onChange={value => setAccount(account => ({...account, groups: value}))}
					/>
				</Field>
			</Row>
		</Form>
	)
}

function WebexAccounts() {

	const dispatch = useDispatch();
	const {loading, ids, entities} = useSelector(state => state[dataSet]);

	React.useEffect(() => {
		if (!loading)
			dispatch(loadWebexAccounts());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => dispatch(loadWebexAccounts());
	return <>
		<TopRow>
			<h3>Webex accounts</h3>
			<div style={{display: 'flex'}}>
				<ActionButtonDropdown
					name='add'
					title='Add account'
					dropdownRenderer={(props) => <WebexAccountAddEdit type='add' {...props} />}
				/>
				<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
			</div>
		</TopRow>
		<div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
			<WebexAccountHeader />
			{ids.map(id => <WebexAccountRow key={id} account={entities[id]} />)}
		</div>
	</>
}


export default WebexAccounts;
