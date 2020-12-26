import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {getUsers} from '../actions/users'
import styled from '@emotion/styled'
import {strComp} from '../lib/utils'

const StyledItem = styled.span`
	padding: 4px 10px;
	color: #555;
	border-radius: 3px;
	margin: 3px;
	cursor: pointer;
	${({ isSelected }) => isSelected? 'color: #fff; background: #0074d9;': 'color: #555; :hover {background: #f2f2f2;}'}
	& > span {
		margin: 5px 10px;
		${({ isItalic }) => isItalic && 'font-style: italic;'}
	}
`;

const StyledAdd = styled.span`
	padding: 4px 10px;
	border-radius: 3px;
	margin: 3px;
	cursor: pointer;
	color: #0074D9;
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

const renderItem = ({item, props, state, methods}) => (
	<StyledItem
		key={item.value}
		onClick={() => methods.addItem(item)}
		isSelected={methods.isSelected(item)}
		isItalic={typeof item.value === 'string'}
	>
		<span>{item.label}</span>
	</StyledItem>
);

const renderAddItem = ({item, props, state, methods}) => (
	<StyledAdd
		key={'__add__'}
		onClick={() => methods.addItem(item)}
		isSelected={false}
		isItalic={true}
	>
		{'add "'}<span>{item.label}</span>{'"'}
	</StyledAdd>
);

const renderDropdown = ({props, state, methods}) => {
	//const {options} = props
	const options = methods.searchResults()
	const presentOptions = options.filter(o => o.present).map(item => renderItem({item, props, state, methods}))
	const additionalOptions = options.filter(o => !o.present).map(item => renderItem({item, props, state, methods}))
	return (
		<React.Fragment>
			{state.search && renderAddItem({item: {value: state.search, label: state.search}, props, state, methods})}
			{presentOptions}
			{additionalOptions.length > 0 && <hr key='__hr__' style={{width: '100px'}}/>}
			{additionalOptions}
			{presentOptions.length === 0 && additionalOptions.length === 0 && <StyledNoData key='__nodata__'>No Data</StyledNoData>}
		</React.Fragment>
	)
};

const StyledSelect = styled(Select)`
	background-color: white;
	border: 1px solid #ddd;
	padding: 0;
	box-sizing: border-box;
	width: ${({width}) => typeof width === 'undefined'? 'unset': (width + (typeof width === 'number'? 'px': ''))};
	& .react-dropdown-select-input {
		font-size: unset;
		&::placeholder {
			font-style: italic;
			color: GreyText;
		}
	}
`;

function AssigneeSelector({
	value,		// value is object {SAPIN: number, Name: string}
	onChange,
	users,
	comments,
	valid,
	loading,
	getUsers,
	width,
	placeholder,
}) {

	React.useEffect(() => {
		if (!valid)
			getUsers()
	}, [])

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
		return options
	}, [comments, users])

	function handleChange(values) {
		if (values.length > 0) {
			const v = values[0]
			const newValue = {SAPIN: typeof v.value === 'number'? v.value: null, Name: v.label}
			onChange(newValue)
		}
		else {
			if (value.SAPIN || value.Name) {
				const newValue = {SAPIN: null, Name: null}
				onChange(newValue)
			}
		}
	}

	const optionSelected = options.find(o => o.value === (value.SAPIN || value.Name))

	return (
		<StyledSelect
			width={width}
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			placeholder={placeholder}
			dropdownRenderer={renderDropdown}
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
	getUsers: PropTypes.func.isRequired
}

export default connect(
	(state) => {
		const {users, comments} = state
		return {
			valid: users.valid,
			loading: users.loading,
			users: users.users,
			comments: comments.comments,
		}
	},
	(dispatch) => {
		return {
			getUsers: () => dispatch(getUsers())
		}
	}
)(AssigneeSelector)