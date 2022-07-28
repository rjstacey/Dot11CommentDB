import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Field, Col} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	addOfficer,
	updateOfficer,
	deleteOfficer,
	selectOfficersState,
	selectGroupOfficers
} from '../store/officers';

import MemberSelector from '../components/MemberSelector';
import OfficerPositionSelector from './OfficerPositionSelector';

const OfficerTable = styled.table`
	display: grid;
	grid-template-columns: minmax(200px, auto) minmax(300px, 1fr) 40px;
	border-spacing: 1px;

	& * {
		box-sizing: border-box;
	}

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		padding: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		color: gray;
		font-style: italic;
	}

	tr:nth-of-type(even) td {
		background: #fafafa;
	}
`;

function OfficerTableHeader({group, readOnly}) {
	const dispatch = useDispatch();
	const handleAdd = () => {
		const officer = {
			group_id: group.id,
			position: '',
		};
		dispatch(addOfficer(officer));
	};

	const headerColumns = [
		'Position',
		'Member'
	];

	if (!readOnly)
		headerColumns.push(<ActionIcon type='add' onClick={handleAdd}/>);

	return (
		<thead>
			<tr>
				{headerColumns.map((element, i) => <th key={i}>{element}</th>)}
			</tr>
		</thead>
	);
}

function OfficerTableRow({officer, readOnly}) {
	const dispatch = useDispatch();
	const handleUpdate = (changes) => dispatch(updateOfficer({id: officer.id, changes}));
	const handleDelete = () => dispatch(deleteOfficer(officer.id));

	const rowColumns = [
		<OfficerPositionSelector
			value={officer.position}
			onChange={(position) => handleUpdate({position})}
			readOnly={readOnly}
		/>,
		<MemberSelector
			value={officer.sapin}
			onChange={(sapin) => handleUpdate({sapin})}
			readOnly={readOnly}
		/>
	];

	if (!readOnly)
		rowColumns.push(<ActionIcon type='delete' onClick={handleDelete}/>);

	return (
		<tr>
			{rowColumns.map((element, i) => <td key={i}>{element}</td>)}
		</tr>
	)
}

const OfficerTableEmpty = () => 
	<tr>
		<td className='empty'>Empty</td>
	</tr>

function Officers({group, readOnly}) {
	const selectOfficers = React.useCallback((state) => selectGroupOfficers(selectOfficersState(state), group.id), [group.id]);
	const officers = useSelector(selectOfficers);
	return (
		<Col>
			<Field label='Officers:' />
			<OfficerTable>
				<OfficerTableHeader group={group} readOnly={readOnly} />
				<tbody>
					{officers.length > 0?
						officers.map(officer => <OfficerTableRow key={officer.id} officer={officer} readOnly={readOnly} />):
						<OfficerTableEmpty />}
				</tbody>
			</OfficerTable>
		</Col>
	)
}

Officers.propTypes = {
	group: PropTypes.object.isRequired,
	readOnly: PropTypes.bool
}

export default Officers;
