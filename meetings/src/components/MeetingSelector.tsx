import React from 'react';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Select, SelectRendererProps } from 'dot11-components';

import {
	loadMeetings,
	selectMeetingsState,
	getField
} from '../store/meetings';

const StyledItem = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	padding: 3px 0;
`;
	//${({ isSelected }) => isSelected? 'color: #fff; background: #0074d9;': 'color: #555; :hover {background: #f2f2f2;}'}

const renderItem = ({item, props, state, methods}: {item: any} & SelectRendererProps) => {
	const textDecoration = item.isCancelled? 'line-through': 'none';
	return (
		<StyledItem
			key={item.value}
			//style={style}
			//className={className}
			onClick={(e) => {methods.addItem(item)}}
			//isSelected={methods.isSelected(item)}
		>
			<span style={{textDecoration}}>
				{item.summary}
			</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller', marginLeft: '1rem', textDecoration}}>
				{`${getField(item, 'date')} ${getField(item, 'timeRange')}`}
			</span>
		</StyledItem>
	)
}

function MeetingSelector({
	value,
	onChange,
	readOnly,
	fromDate,
	toDate,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
	fromDate?: string;
	toDate?: string;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const dispatch = useAppDispatch();
	const {valid, loading, ids, entities} = useAppSelector(selectMeetingsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMeetings());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => {
		let options = ids.map(id => entities[id]!);
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
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

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

export default MeetingSelector;
