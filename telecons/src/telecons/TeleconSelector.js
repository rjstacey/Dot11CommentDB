import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Select} from 'dot11-components/form';

import {loadTelecons, selectTeleconsState, getField} from '../store/telecons';

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
		<span>{item.summary}</span>
		<span style={{fontStyle: 'italic', fontSize: 'smaller'}}>{getField(item, 'date')} {getField(item, 'timeRange')}</span>
	</StyledItem>
);

function TeleconSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids, entities} = useSelector(selectTeleconsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadTelecons());
	}, [dispatch, valid, loading, readOnly]);

	const options = React.useMemo(() => ids.map(id => entities[id]), [entities, ids]);
	//const widthCh = options.reduce((maxCh, o) => Math.max(maxCh, o.label.length), 12);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].id: 0;
		if (newValue !== value)
			onChange(newValue);
	}

	const values = options.filter(o => o.id === value);

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
			labelField='summary'
			{...otherProps}
		/>
	)
}

TeleconSelector.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default TeleconSelector;
