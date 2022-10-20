import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';
import {Icon} from 'dot11-components/icons';
import {strComp} from 'dot11-components/lib';

import {loadMembers, selectMembersState} from '../store/members';
import {selectCommentsState} from '../store/comments';

const itemRenderer = ({index, item, style, props, state, methods}) => {
	const name = item[props.labelField];
	const sapin = item[props.valueField];
	const isUser = sapin > 0;

	return (
		<>
			<Icon name={isUser? 'user-check': 'user-slash'} />
			<span style={{marginLeft: 10}}>{name}</span>
		</>
	)
}

function assigneeOptionsSelector(state) {
	const {ids: commentIds, entities: commentEntities} = selectCommentsState(state);
	const {ids: userIds, entities: userEntities} = selectMembersState(state);

	// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
	const presentOptions = commentIds
		.reduce((arr, id) => {
			const c = commentEntities[id];
			if (!c.AssigneeSAPIN && !c.AssigneeName)
				return arr;
			if (c.AssigneeSAPIN && arr.find(o => o.SAPIN === c.AssigneeSAPIN))
				return arr;
			if (arr.find(o => o.Name === c.AssigneeName))
				return arr;
			return [...arr, {SAPIN: c.AssigneeSAPIN || 0, Name: c.AssigneeName || ''}];
		}, [])
		.sort((a, b) => strComp(a.Name, b.Name));

	const userOptions =	userIds
		.filter(sapin => !presentOptions.find(o => o.SAPIN === sapin))
		.map(sapin => ({SAPIN: sapin, Name: userEntities[sapin].Name}))
		.sort((a, b) => strComp(a.Name, b.Name));

	return presentOptions.concat(userOptions);
}

const nullAssignee = {SAPIN: 0, Name: ''};

function AssigneeSelector({
	value,		// value is object with shape {SAPIN: number, Name: string}
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading} = useSelector(selectMembersState);
	const existingOptions = useSelector(assigneeOptionsSelector);
	const [options, setOptions] = React.useState([]);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, []);	// eslint-disable-line

	React.useEffect(() => setOptions(existingOptions), [existingOptions]);

	const handleChange = React.useCallback((values) => onChange(values.length? values[0]: nullAssignee), [onChange]);

	const createOption = React.useCallback(({props, state, methods}) => {
		const value = {SAPIN: 0, Name: state.search};
		setOptions(options => {
			if (options.find(o => o.SAPIN === value.SAPIN && o.Name === value.Name))
				return options;
			return [value, ...options];
		});
		return value;
	}, [setOptions]);

	const values = options.filter(
		value.SAPIN?
			o => o.SAPIN === value.SAPIN:
			o => o.SAPIN === 0 && o.Name === value.Name
	);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			createOption={createOption}
			selectItemRenderer={itemRenderer}
			itemRenderer={itemRenderer}
			readOnly={readOnly}
			valueField='SAPIN'
			labelField='Name'
			{...otherProps}
		/>
	)
}

AssigneeSelector.propTypes = {
	value: PropTypes.shape({
		SAPIN: PropTypes.number,
		Name: PropTypes.string
	}).isRequired,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default AssigneeSelector;
