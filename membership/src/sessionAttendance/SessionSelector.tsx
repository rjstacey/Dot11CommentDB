import React from 'react';
import styled from '@emotion/styled';
import { useAppSelector } from '../store/hooks';

import { Select, displayDateRange } from 'dot11-components';

import { selectSessions, Session } from '../store/sessions';

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

const renderSession = ({item: session}: {item: Session}) =>
	<StyledItem>
		<span>{session.name}</span>
		<span>{displayDateRange(session.startDate, session.endDate)}</span>
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
	const options = useAppSelector(selectSessions).slice().reverse();
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

	return (
		<Select
			style={{...style, minWidth: 300}}
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			valueField='id'
			labelField='name'
		/>
	)
}

export default SessionSelector;
