import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {FixedSizeList as List} from 'react-window'
import {Select} from 'dot11-common/general/Form'
import {loadTimeZones} from '../store/sessions'

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
	valid,
	loading,
	timeZones,
	loadTimeZones,
	readOnly,
	...otherProps
}) {

	React.useEffect(() => {
		if (!valid && !loading)
			loadTimeZones();
	}, []);

	const options = React.useMemo(() => timeZones.map(tz => ({value: tz, label: tz})), [timeZones]);

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
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

TimeZoneSelector.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	timeZones: PropTypes.array.isRequired,
	loadTimeZones: PropTypes.func.isRequired
}

const dataSet = 'sessions'
export default connect(
	(state) => ({
		valid: state[dataSet].timeZones.length > 0,
		loading: state[dataSet].loadingTimeZones,
		timeZones: state[dataSet].timeZones,
	}),
	{loadTimeZones}
)(TimeZoneSelector)
