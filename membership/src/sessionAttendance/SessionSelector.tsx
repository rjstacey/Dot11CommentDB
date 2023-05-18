import React from 'react';
import styled from '@emotion/styled';
import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Select, displayDateRange } from 'dot11-components';

import { selectSessionIds, selectSessionEntities, Session } from '../store/attendances';

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

const renderItem = ({item}: {item: Session}) =>
	<StyledItem>
		<span>{item.name}</span>
		<span>{displayDateRange(item.startDate, item.endDate)}</span>
	</StyledItem>

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
	//const dispatch = useAppDispatch();
	const ids = useAppSelector(selectSessionIds);
	const entities = useAppSelector(selectSessionEntities);
	//const {valid, loading, ids, entities} = useAppSelector(selectSessionsState);

	/*React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps */

	const options = React.useMemo(() => ids.map(id => entities[id]!), [entities, ids]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

	return (
		<Select
			style={{...style, minWidth: 300}}
			values={values}
			onChange={handleChange}
			options={options}
			//loading={loading}
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

export default SessionSelector;
