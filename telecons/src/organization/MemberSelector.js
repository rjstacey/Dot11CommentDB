import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Select} from 'dot11-components/form';
import {Icon} from 'dot11-components/icons';
import {strComp} from 'dot11-components/lib';

import {loadMembers, selectMembersState} from '../store/members';

const StyledItem = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	display: flex;
	align-items: center;
	${({ isSelected }) => isSelected? 'color: #fff; background: #0074d9;': 'color: #555; :hover {background: #f2f2f2;}'}
	& > span {
		margin: 5px 10px;
	}
`;

const renderItem = ({item, style, props, state, methods}) => (
	<StyledItem
		key={item.value}
		style={style}
		onClick={(e) => {methods.addItem(item)}}
		isSelected={methods.isSelected(item)}
	>
		<Icon name='user-check' />
		<span>{item.label}</span>
	</StyledItem>
);

function MemberSelector({
	value,		// value is SAPIN
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids: userIds, entities: userEntities} = useSelector(selectMembersState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, []);

	const options = React.useMemo(() => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const userOptions =	userIds
			.map(sapin => ({value: sapin, label: userEntities[sapin].Name}))
			.sort((a, b) => strComp(a.label, b.label));
		return userOptions;
	}, [userEntities, userIds]);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: 0;
		if (newValue !== value)
			onChange(newValue);
	}

	const optionSelected = options.find(o => o.value === value);

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			itemRenderer={renderItem}
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

MemberSelector.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default MemberSelector;
