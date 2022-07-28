import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Select} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';

import {loadImatMeetings, selectImatMeetingsState} from '../store/imatMeetings';


const StyledItem = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	display: flex;
	flex-direction: column;
	align-items: left;
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
		<span>{item.name}</span>
		<span style={{fontStyle: 'italic', fontSize: 'smaller'}}>{displayDateRange(item.start, item.end)}</span>
	</StyledItem>
);

function ImatMeetingSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids, entities} = useSelector(selectImatMeetingsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadImatMeetings());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => ids.map(id => entities[id]), [entities, ids]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].id: 0);

	return (
		<Select
			style={{minWidth: 300}}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			itemRenderer={renderItem}
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			valueField='id'
			labelField='name'
			{...otherProps}
		/>
	)
}

ImatMeetingSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default ImatMeetingSelector;
