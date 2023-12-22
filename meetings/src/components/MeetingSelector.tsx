import React from 'react';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';

import { useAppSelector } from '../store/hooks';

import { Select } from 'dot11-components';

import {
	selectMeetingsState,
	getField,
	Meeting
} from '../store/meetings';

const StyledItem = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	padding: 3px 0;
`;

const renderItem = ({item}: {item: Meeting}) => {
	let summary = item.summary;
	if (item.isCancelled)
		summary = '🚫 ' + summary;
	return (
		<StyledItem>
			<span>
				{summary}
			</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller', marginLeft: '1rem'}}>
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
	const {loading, valid, ids, entities} = useAppSelector(selectMeetingsState);

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
			loading={loading && !valid}
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
