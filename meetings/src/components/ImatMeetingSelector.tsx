import React from 'react';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {Select, SelectItemRendererProps, displayDateRange} from 'dot11-components';

import {loadImatMeetings, selectImatMeetingsState} from '../store/imatMeetings';


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

const renderItem = ({item, /*style,*/ props, state, methods}: SelectItemRendererProps) =>
	<StyledItem
		//style={style}
	>
		<span>{item.name}</span>
		<span>{displayDateRange(item.start, item.end)}</span>
	</StyledItem>

function ImatMeetingSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "loading" | "clearable">) {
	const dispatch = useAppDispatch();
	const {valid, loading, ids, entities} = useAppSelector(selectImatMeetingsState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadImatMeetings());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => ids.map(id => entities[id]!), [entities, ids]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: 0);

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
			portal={document.querySelector('#root')}
			valueField='id'
			labelField='name'
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

export default ImatMeetingSelector;
