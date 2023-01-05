import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {Col, Checkbox, Input} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';


const contactEmailColumns = [
	{key: 'Email', label: 'Email'},
	{key: 'Primary', label: 'Primary', styleCell: {justifyContent: 'center'}},
	{key: 'Broken', label: 'Broke', styleCell: {justifyContent: 'center'}},
	{key: 'DateAdded', label: 'Date added', renderCell: entry => DateTime.fromISO(entry.DateAdded).toLocaleString(DateTime.DATE_MED)},
	{key: 'actions', label: '', styleCell: {justifyContent: 'space-around'}},
];

function MemberContactEmails({
	member,
	updateMember,
	readOnly
}) {
	const contactEmails = member.ContactEmails;
	const disableAdd = contactEmails.length > 0 && contactEmails[0].Email === '';

	const columns = React.useMemo(() => {

		function addContactEmail() {
			const id = contactEmails.reduce((maxId, h) => h.id > maxId? h.id: maxId, 0) + 1;
			const contactEmail = {id, Email: '', Primary: 0, Broken: 0, DateAdded: DateTime.now().toISO()};
			const ContactEmails = [contactEmail, ...contactEmails];
			updateMember({ContactEmails});
		}

		function updateContactEmail(id, changes) {
			const ContactEmails = contactEmails.map(h => h.id === id? {...h, ...changes}: h);
			updateMember({ContactEmails});
		}

		function deleteContactEmail(id) {
			const ContactEmails = contactEmails.filter(h => h.id !== id);
			updateMember({ContactEmails});
		}

		return contactEmailColumns.map(col => {

			let renderCell, label;

			if (col.key === 'Email') {
				renderCell = (entry) =>
					<Input type='text'
						style={{width: '100%'}}
						value={entry.Email}
						onChange={e => updateContactEmail(entry.id, {Email: e.target.value})}
						disabled={readOnly}
					/>
			}
			if (col.key === 'Primary') {
				renderCell = (entry) =>
					<Checkbox 
						checked={entry.Primary}
						onChange={e => updateContactEmail(entry.id, {Primary: e.target.checked})}
						disabled={readOnly}
					/>
			}
			if (col.key === 'Broken') {
				renderCell = (entry) =>
					<Checkbox 
						checked={entry.Broken}
						onChange={e => updateContactEmail(entry.id, {Broken: e.target.checked})}
						disabled={readOnly}
					/>
			}
			if (col.key === 'actions' && !readOnly) {
				label = <ActionIcon name='add' disabled={disableAdd} onClick={addContactEmail} />
				renderCell = (entry) => <ActionIcon name='delete' onClick={() => deleteContactEmail(entry.id)} />
			}

			if (renderCell)
				col = {...col, renderCell};

			if (label)
				col = {...col, label};

			return col;
		})
	}, [contactEmails, updateMember, disableAdd, readOnly]);

	return (
		<Table
			columns={columns}
			values={contactEmails}
			rowId='id'
		/>
	)
}

const ContactInfoField = styled.div`
	display: flex;
	align-items: center;
	div:first-of-type {
		font-weight: bold;
		width: 100px;
	}
`;

const ContactInfoFields = [
	{key: 'StreetLine1', label: 'Street', size: 36},
	{key: 'StreetLine2', label: '', size: 36},
	{key: 'City', label: 'City', size: 20},
	{key: 'State', label: 'State', size: 20},
	{key: 'Zip', label: 'Zip/Code'},
	{key: 'Country', label: 'Country'},
	{key: 'Phone', label: 'Phone'},
];

function MemberContactInfo({
	member,
	updateMember,
	readOnly
}) {
	const i = member.ContactInfo || {};

	const rows = ContactInfoFields.map(f => 
		<ContactInfoField key={f.key} >
			<div>{f.label}</div>
			<Input
				type='text'
				size={f.size}
				value={i[f.key]}
				onChange={e => updateMember({ContactInfo: {...i, [f.key]: e.target.value}})}
				disabled={readOnly}
			/>
		</ContactInfoField>
	);

	return (
		<Col style={{marginLeft: 10}}>
			<MemberContactEmails
				member={member}
				updateMember={updateMember}
				readOnly={readOnly}
			/>
			{rows}
		</Col>
	)
}

MemberContactInfo.propTypes = {
	member: PropTypes.object.isRequired,
	updateMember: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default MemberContactInfo;
