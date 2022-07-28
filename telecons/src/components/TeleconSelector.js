import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {Select} from 'dot11-components/form';

import {
	loadTelecons,
	selectTeleconsState,
	getField
} from '../store/telecons';

const StyledItem = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	padding: 3px 0;
	${({ isSelected }) => isSelected? 'color: #fff; background: #0074d9;': 'color: #555; :hover {background: #f2f2f2;}'}
`;

const renderItem = ({item, style, className, props, state, methods}) => (
	<StyledItem
		key={item.value}
		style={style}
		className={className}
		onClick={(e) => {methods.addItem(item)}}
		//isSelected={methods.isSelected(item)}
	>
		<span>{item.summary}</span>
		<span style={{fontStyle: 'italic', fontSize: 'smaller', marginLeft: '1rem'}}>{`${getField(item, 'date')} ${getField(item, 'timeRange')}`}</span>
	</StyledItem>
);

function TeleconSelector({
	value,
	onChange,
	readOnly,
	fromDate,
	toDate,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids, entities} = useSelector(selectTeleconsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadTelecons());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => {
		let options = ids.map(id => entities[id]);
		if (fromDate) {
			const date = DateTime.fromISO(fromDate);
			options = options.filter(o => DateTime.fromISO(o.start) >= date);
		}
		if (toDate) {
			const date = DateTime.fromISO(toDate);
			options = options.filter(o => DateTime.fromISO(o.end) <= date);
		}
		return options;
	}, [entities, ids, fromDate, toDate]);

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
			selectItemRenderer={renderItem}
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
