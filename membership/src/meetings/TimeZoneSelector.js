import React from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {FixedSizeList as List} from 'react-window';
import {Select} from 'dot11-components/form';
import {loadTimeZones, selectTimeZonesState} from '../store/sessions';

const StyledItem = styled.div`
	padding: 4px 10px;
	color: #555;
	border-radius: 3px;
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	display: flex;
	align-items: center;
	${({ isSelected }) => isSelected? 'color: #fff; background: #0074d9;': 'color: #555; :hover {background: #f2f2f2;}'}
	& > span {
		margin: 5px 10px;
	}
`;

const renderDropdown = ({props, state, methods}) => {
	const options = methods.searchResults()
	return (
		<List
			height={300}
			itemCount={options.length}
			itemSize={30}
			width='auto'
		>
			{({index, style}) => {
				const item = options[index];
				return (
					<StyledItem
						key={item.value}
						style={style}
						onClick={() => methods.addItem(item)}
						isSelected={methods.isSelected(item)}
					>
						<span>{item.label}</span>
					</StyledItem>
				)
			}}
		</List>
	)
};

function TimeZoneSelector({
	value,
	onChange,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, timeZones} = useSelector(selectTimeZonesState);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadTimeZones());
	}, []);

	let options = React.useMemo(() => timeZones.map(tz => ({value: tz, label: tz})), [timeZones]);

	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);

	const optionSelected = options.find(o => o.value === value);

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={timeZones.length === 0}
			clearable
			dropdownRenderer={renderDropdown}
			{...otherProps}
		/>
	)
}

TimeZoneSelector.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
}

export default TimeZoneSelector;
