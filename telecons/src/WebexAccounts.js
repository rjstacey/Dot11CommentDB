import PropTypes from 'prop-types'
import React from 'react'
import {Redirect} from 'react-router-dom'
import {connect, useDispatch} from 'react-redux'
import styled from '@emotion/styled'
import {ButtonGroup, ActionButton} from 'dot11-components/icons'
import {Form, Field, Row, Input} from  'dot11-components/general/Form'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {loadWebexAccounts, updateWebexAccount, addWebexAccount, deleteWebexAccount, getWebexAccountAuthLink, authWebexAccount} from './store/webex'


// The top row height is determined by its content
const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function getHeader() {
	return (
		<div style={{display: 'flex'}}>
			<div style={{flex: '0 0 200px'}}>Short name</div>
			<div style={{flex: '0 0 200px'}}>Template</div>
			<div style={{flex: '0 0 200px'}}>Active</div>
		</div>
	)
}

function getRow(account, onDelete, onEdit) {
	return (
		<div key={account.id} style={{display: 'flex'}}>
			<div style={{flex: '0 0 200px'}}>{account.shortName}</div>
			<div style={{flex: '0 0 200px'}}>{account.template}</div>
			<div style={{flex: '0 0 200px'}}>{account.isActive? 'Active': 'Inactive'}</div>
			<div style={{flex: '0 0 200px'}}>
				<ActionButton name='edit' onClick={() => onEdit(account)} />
				<ActionButton name='delete' onClick={() => onDelete(account.id)} />
			</div>
			<div>
				<a href={getWebexAccountAuthLink(account.id)}>Auth</a>
			</div>
		</div>
	)
}

const defaultAccount = {
	group: '802.11',
	shortName: '',
	template: ''
};

function WebexAdd({addWebexAccount, close}) {
	const [account, setAccount] = React.useState(defaultAccount);

	async function handleAdd() {
		await addWebexAccount(account);
		close();
	}

	const change = e => {
		const {name, value} = e.target;
		setAccount(account => ({...account, [name]: value}));
	}

	return (
		<Form
			title='Add Webex account'
			submit={handleAdd}
		>
			<Row>
				<Field
					label='Name:'
				>
					<Input
						type='search'
						name='shortName'
						value={account.shortName}
						onChange={change}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label='Template:'
				>
					<Input
						type='search'
						name='template'
						value={account.template}
						onChange={change}
					/>
				</Field>
			</Row>
		</Form>
	)
}

function WebexAccounts({ids, entities, loading, loadWebexAccounts, addWebexAccount, deleteWebexAccount, updateWebexAccount}) {

	React.useEffect(() => {
		if (!loading)
			loadWebexAccounts();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<>
			<TopRow>
				<div />
				<ButtonGroup>
					<ActionButtonDropdown
						name='add'
						title='Add account'
						dropdownRenderer={(props) => <WebexAdd addWebexAccount={addWebexAccount} {...props} />}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={loadWebexAccounts} disabled={loading} />
				</ButtonGroup>
			</TopRow>
			<div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
				{getHeader()}
				{ids.map(id => getRow(entities[id], deleteWebexAccount))}
			</div>
		</>
	)
}

WebexAccounts.propTypes = {
	ids: PropTypes.array.isRequired, 
	entities: PropTypes.object.isRequired,
	loading: PropTypes.bool.isRequired,
	loadWebexAccounts: PropTypes.func.isRequired,
	addWebexAccount: PropTypes.func.isRequired,
	deleteWebexAccount: PropTypes.func.isRequired,
	updateWebexAccount: PropTypes.func.isRequired
}

const dataSet = 'webex';

export default connect(
	(state) => ({
		...state[dataSet],
	}),
	{loadWebexAccounts, addWebexAccount, updateWebexAccount, deleteWebexAccount}
)(WebexAccounts);

export function WebexAuth(props) {
	const query = new URLSearchParams(props.location.search);
	const code = query.get('code');
	const state = query.get('state');
	const [msg, setMsg] = React.useState('waiting...');
	const dispatch = useDispatch();

	React.useEffect(() => {
		dispatch(authWebexAccount(code, state))
			.then(() => setMsg('OK'));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return msg === 'OK'? <Redirect to="/webex/accounts" />: <div>{msg}</div>
}

export function WebexSelector(props) {
	
}
