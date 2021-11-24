import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {FixedSizeList as List} from 'react-window';
import Input from 'react-dropdown-select/lib/components/Input';

import {Select} from 'dot11-components/form';
import {Icon} from 'dot11-components/icons';
import {strComp} from 'dot11-components/lib';

import {loadUsers, getUsersDataSet} from '../store/users';
import {getCommentsDataSet} from '../store/comments';

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
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {ids: commentIds, entities: commentEntities} = useSelector(getCommentsDataSet);
	const {valid, loading, ids: userIds, entities: userEntities} = useSelector(getUsersDataSet);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadUsers());
	}, []);

	const options = React.useMemo(() => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const presentOptions = commentIds
			.reduce((arr, id) => {
				const c = commentEntities[id];
				if (c.AssigneeSAPIN) {
					return arr.find(o => o.value === c.AssigneeSAPIN)? arr: [...arr, {value: c.AssigneeSAPIN, label: c.AssigneeName, present: true}];
				}
				if (c.AssigneeName) {
					return arr.find(o => o.value === c.AssigneeName)? arr: [...arr, {value: c.AssigneeName, label: c.AssigneeName, present: true}];
				}
				return arr
			}, [])
			.sort((a, b) => strComp(a.label, b.label));
		const userOptions =	userIds
			.filter(sapin => !presentOptions.find(o => o.value === sapin))
			.map(sapin => ({value: sapin, label: userEntities[sapin].Name, present: false}))
			.sort((a, b) => strComp(a.label, b.label));
		return presentOptions.concat(userOptions);
	}, [commentEntities, commentIds, userEntities, userIds]);

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
	readOnly: PropTypes.bool,
}

export default AssigneeSelector;
