import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {FixedSizeList as List} from 'react-window'
import Input from 'react-dropdown-select/lib/components/Input'
import {Select} from 'dot11-common/general/Form'

import {loadMembers} from '../store/members'

const StyledItem = styled.div`
	padding: 4px 10px;
	border-radius: 3px;
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	${({ isSelected }) => isSelected?
		'color: #fff; background: #0074d9;':
		'color: #555; :hover {background: #f2f2f2;}'}
`;

const StyledNoData = styled.div`
	padding: 10px;
    text-align: center;
    color: #0074D9;
`;

const renderItem = ({item, style, props, state, methods}) =>
	<StyledItem
		key={item.value}
		style={style}
		onClick={() => methods.addItem(item)}
		isSelected={methods.isSelected(item)}
	>
		{item.label}
	</StyledItem>

const renderDropdown = ({props, state, methods}) => {
	const options = methods.searchResults();
	return (
		<List
			height={300}
			itemCount={options.length}
			itemSize={30}
			width='auto'
		>
			{({index, style}) => renderItem({item: options[index], style, props, state, methods})}
		</List>
	)
};

const StyledContentItem = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const renderContent = ({state, methods, props}) => {
	const label = state.values.length > 0? state.values[0].label: '';
	return (
		<React.Fragment>
			{label &&
				<StyledContentItem>
					{label}
				</StyledContentItem>}
			<Input props={props} methods={methods} state={state} />
		</React.Fragment>
	)
}

function MemberSelector({
	style,
	className,
	value,
	onChange,
	entities,
	ids,
	valid,
	loading,
	loadMembers,
	readOnly,
	...otherProps
}) {

	React.useEffect(() => {
		if (!valid && !readOnly)
			loadMembers()
	}, [valid, readOnly]);

	const options = React.useMemo(() => 
		ids.map(id => {
			const member = entities[id];
			const label = `${member.SAPIN} ${member.Name} <${member.Email}>`;
			return {value: id, label}
		})
	);

	const optionSelected = options.find(o => o.value === value);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue)
	}

	return (
		<Select
			style={style}
			className={className}
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			contentRenderer={renderContent}
			dropdownRenderer={renderDropdown}
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

MemberSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	entities: PropTypes.object.isRequired,
	ids: PropTypes.array.isRequired,
	loadMembers: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

const dataSet = 'members';

export default connect(
	(state) => {
		return {
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			entities: state[dataSet].entities,
			ids: state[dataSet].ids,
		}
	},
	{loadMembers}
)(MemberSelector)