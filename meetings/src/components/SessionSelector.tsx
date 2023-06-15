import React from 'react';
import styled from '@emotion/styled';
import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Select, ActionIcon, displayDateRange } from 'dot11-components';

import { loadSessions, selectSessionsState, selectSessions, Session } from '../store/sessions';

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
	const dispatch = useAppDispatch();
	const {valid, loading} = useAppSelector(selectSessionsState);
	const options = useAppSelector(selectSessions);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			valueField='id'
			labelField='name'
		/>
	)
}

export function RawSessionSelector({
	style,
	onChange
}: {
	style?: React.CSSProperties;
	onChange: (value: number) => void;
}) {
	const options = useAppSelector(selectSessions);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: 0);
	return (
		<Select
			style={{...style, border: 'none', padding: 'none'}}
			options={options}
			values={[]}
			onChange={handleChange}
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
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
