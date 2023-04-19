import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import {useAppDispatch, useAppSelector} from '../store/hooks';

import {Select, SelectRendererProps, ActionIcon, displayDateRange} from 'dot11-components';

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

const renderItem = ({item, props, state, methods}: {item: any} & SelectRendererProps) =>
	<StyledItem
		//style={style}
	>
		<span>{item.name}</span>
		<span>{displayDateRange(item.startDate, item.endDate)}</span>
	</StyledItem>

interface SelectOption {
	id: number;
	name: string;
}

function SessionSelector({
	value,
	onChange,
	readOnly,
	style,
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
	style?: React.CSSProperties;
}) {
	const dispatch = useAppDispatch();
	const {valid, loading, ids, entities} = useAppSelector(selectSessionsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => ids.map(id => entities[id]!), [entities, ids]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

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
		/>
	)
}

SessionSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

interface RawSessionSelectorProps {
	style?: React.CSSProperties;
	onChange: (value: number) => void; 
}

function RawSessionSelector({style, onChange}: RawSessionSelectorProps) {
	const {ids, entities} = useAppSelector(selectSessionsState);
	const options = React.useMemo(() => ids.map(id => entities[id]), [entities, ids]);
	return (
		<Select
			style={{...style, border: 'none', padding: 'none'}}
			options={options}
			values={[]}
			onChange={(values: Array<SelectOption>) => onChange(values.length? values[0].id: 0)}
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
