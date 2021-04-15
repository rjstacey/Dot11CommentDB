import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {FixedSizeList as List} from 'react-window'
import Input from 'react-dropdown-select/lib/components/Input'
import {Select} from 'dot11-common/general/Form'
import {Icon} from 'dot11-common/lib/icons'
import {getData} from 'dot11-common/store/dataSelectors'
import {strComp} from 'dot11-common/lib/utils'

import {loadUsers} from '../store/users'

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
		${({ isItalic }) => isItalic && 'font-style: italic;'}
	}
`;

const StyledAdd = styled.div`
	padding: 4px 10px;
	border-radius: 3px;
	cursor: pointer;
	color: #0074D9;
	display: flex;
	align-items: center;
	:hover {background: #f2f2f2}
	& > span {
		font-style: italic;
	}
`;

const StyledNoData = styled.div`
	padding: 10px;
    text-align: center;
    color: #0074D9;
`;

const renderItem = ({item, style, props, state, methods}) => (
	<StyledItem
		key={item.value}
		style={style}
		onClick={() => methods.addItem(item)}
		isSelected={methods.isSelected(item)}
		isItalic={typeof item.value === 'string'}
	>
		<Icon name={typeof item.value === 'number'? 'user-check': 'user-slash'} />
		<span>{item.label}</span>
	</StyledItem>
);

const renderAddItem = ({item, style, props, state, methods}) => (
	<StyledAdd
		key={'__add__'}
		style={style}
		onClick={() => methods.addItem(item)}
		isSelected={false}
		isItalic={true}
	>
		{'add "'}<span>{item.label}</span>{'"'}
	</StyledAdd>
);

const renderDropdown = ({props, state, methods}) => {
	const options = methods.searchResults()
	return (
		<List
			height={300}
			itemCount={options.length + (state.search? 1: 0)}
			itemSize={30}
			width='auto'
		>
			{({index, style}) => {
				if (state.search) {
					if (index === 0)
						return renderAddItem({item: {value: state.search, label: state.search}, style, props, state, methods})
					index -= 1;
				}
				return renderItem({item: options[index], style, props, state, methods})
			}}
		</List>
	)
};

const StyledContentItem = styled.div`
	& > span {
		margin-left: 10px;
	}
`;

const renderContent = ({state, methods, props}) => {
	const item = state.values.length > 0? state.values[0]: null;
	return (
		<React.Fragment>
			{item &&
				<StyledContentItem>
					<Icon name={typeof item.value === 'number'? 'user-check': 'user-slash'} />
					<span>{item.label}</span>
				</StyledContentItem>}
			<Input props={props} methods={methods} state={state} />
		</React.Fragment>
	)
}

function AssigneeSelector({
	value,		// value is object with shape {SAPIN: number, Name: string}
	onChange,
	users,
	comments,
	valid,
	loading,
	loadUsers,
	width,
	readOnly,
	...otherProps
}) {

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			loadUsers()
	}, [valid, loadUsers, readOnly])

	const options = React.useMemo(() => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const presentOptions = comments.reduce((arr, c) => {
				if (c.AssigneeSAPIN) {
					return arr.find(o => o.value === c.AssigneeSAPIN)? arr: [...arr, {value: c.AssigneeSAPIN, label: c.AssigneeName, present: true}];
				}
				if (c.AssigneeName) {
					return arr.find(o => o.value === c.AssigneeName)? arr: [...arr, {value: c.AssigneeName, label: c.AssigneeName, present: true}];
				}
				return arr
			}, [])
			.sort((a, b) => strComp(a.label, b.label))
		const userOptions =
			users.filter(u => !presentOptions.find(o => o.value === u.SAPIN))
			.map(u => ({value: u.SAPIN, label: u.Name, present: false}))
			.sort((a, b) => strComp(a.label, b.label))
		const options = presentOptions.concat(userOptions)
		//console.log(presentOptions, options)
		return options
	}, [comments, users])

	function handleChange(values) {
		let newValue;
		if (values.length > 0) {
			const v = values[0]
			newValue = {SAPIN: typeof v.value === 'number'? v.value: null, Name: v.label}
		}
		else {
			newValue = {SAPIN: null, Name: null}
		}
		if (newValue.SAPIN !== value.SAPIN || newValue.Name !== value.Name)
			onChange(newValue)
	}

	const optionSelected = options.find(o => o.value === (value.SAPIN || value.Name))

	return (
		<Select
			width={width}
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			contentRenderer={renderContent}
			dropdownRenderer={renderDropdown}
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

AssigneeSelector.propTypes = {
	value: PropTypes.object.isRequired,
	onChange: PropTypes.func.isRequired,
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	users: PropTypes.array.isRequired,
	comments: PropTypes.array.isRequired,
	loadUsers: PropTypes.func.isRequired
}

export default connect(
	(state) => {
		return {
			valid: state.users.valid,
			loading: state.users.loading,
			users: getData(state, 'users'),
			comments: getData(state, 'comments')
		}
	},
	{loadUsers}
)(AssigneeSelector)