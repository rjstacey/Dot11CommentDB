import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Select} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';
import {ActionIcon} from 'dot11-components/icons';

import {loadSessions, selectSessionsState} from '../store/sessions';

const StyledItem = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	display: flex;
	flex-direction: column;
	align-items: left;
	& > span:last-of-type {
		font-style: italic;
		font-size: smaller;
	}
`;

const renderItem = ({item, style, props, state, methods}) =>
	<StyledItem
		style={style}
	>
		<span>{item.name}</span>
		<span>{displayDateRange(item.startDate, item.endDate)}</span>
	</StyledItem>

function SessionSelector({
	value,
	onChange,
	readOnly,
	style,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids, entities} = useSelector(selectSessionsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => ids.map(id => entities[id]), [entities, ids]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].id: 0);

	return (
		<Select
			style={{...style, minWidth: 300}}
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
			labelField='name'
			{...otherProps}
		/>
	)
}

SessionSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

function RawSessionSelector({style, onChange}) {
	const {ids, entities} = useSelector(selectSessionsState);
	const options = React.useMemo(() => ids.map(id => entities[id]), [entities, ids]);
	return (
		<Select
			style={{...style, border: 'none', padding: 'none'}}
			options={options}
			values={[]}
			onChange={(values) => onChange(values.length? values[0].id: null)}
			itemRenderer={renderItem}
			selectItemRenderer={renderItem}
			valueField='id'
			labelField='name'
			placeholder=''
			searchable={false}
			handle={false}
			dropdownWidth={300}
			dropdownAlign='right'
			contentRenderer={() => <ActionIcon name='import' />}
		/>
	)
}

export default SessionSelector;
export {RawSessionSelector};
