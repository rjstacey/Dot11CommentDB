import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

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
import {EditTable as Table} from '../components/Table';

const tableColumns = {
	position: {
		label: 'Position',
		gridTemplate: 'minmax(200px, auto)'
	},
	member: {
		label: 'Member',
		gridTemplate: 'minmax(300px, 1fr)'
	},
	action: {
		label: '',
		gridTemplate: '40px'
	}
};

function Officers({group, readOnly}) {
	const dispatch = useDispatch();
	const selectOfficers = React.useCallback((state) => selectGroupOfficers(selectOfficersState(state), group.id), [group.id]);
	const officers = useSelector(selectOfficers);

	const columns = React.useMemo(() => {
		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key === 'actions');

		const officer = {
			group_id: group.id,
			position: '',
		};

		const addOne = () => dispatch(addOfficer(officer));
		const updateOne = (id, changes) => dispatch(updateOfficer({id, changes}));
		const removeOne = (id) => dispatch(deleteOfficer(id));

		const columns = keys.map(key => {
			const col = {...tableColumns[key]};
			col.key = key;
			if (key === 'position') {
				col.renderCell = (entry) =>
					<OfficerPositionSelector
						value={entry.position}
						onChange={(position) => updateOne(entry.id, {position})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'member') {
				col.renderCell = (entry) =>
					<MemberSelector
						value={entry.sapin}
						onChange={(sapin) => updateOne(entry.id, {sapin})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'action') {
				col.renderCell = (entry) => 
					<ActionIcon type='delete' onClick={() => removeOne(entry.id)} />
				col.label = 
					<ActionIcon type='add' onClick={addOne} />
			}
			return col;
		});

		return columns;
	}, [dispatch, readOnly, group.id]);

	return (
		<Col>
			<Field label='Officers:' />
			<Table
				columns={columns}
				values={officers}
			/>
		</Col>
	)
}

Officers.propTypes = {
	group: PropTypes.object.isRequired,
	readOnly: PropTypes.bool
}

export default Officers;
