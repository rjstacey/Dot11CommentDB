import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {connect} from 'react-redux'

import {Button} from '../general/Icons'
import {ActionButtonDropdown} from '../general/Dropdown'

import {toggleTableFixed, upsertTableColumn} from '../store/ui'

const Row = styled.div`
	margin: 5px 10px;
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const ItemList = styled.div`
	min-height: 10px;
	border: 1px solid #ccc;
	border-radius: 3px;
	margin: 10px;
	padding: 10px;
	overflow: auto;
`;

const Item = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	${({ disabled }) => disabled && 'text-decoration: line-through;'}
	${({ isSelected }) => isSelected? 'background: #0074d9;': ':hover{background: #ccc;}'}
	& > span {
		margin: 5px 5px;
		${({ isSelected }) => isSelected && 'color: #fff;'}
	}
`;

function _ColumnSelectorDropdown({
		tableView,
		tableConfig,
		toggleTableFixed,
		upsertTableColumn
	}) {

	/* Build an array of columns with the 'visible' property */
	const columns = [];
	for (const [key, col] of Object.entries(tableConfig.columns)) {
		if (col.hasOwnProperty('visible'))
			columns.push({key, ...col})
	}

	return (
		<React.Fragment>
			<Row>
				<label>Fixed column width:</label>
				<Button
					onClick={() => toggleTableFixed(tableView)}
					isActive={tableConfig.fixed}
				>
					On
				</Button>
			</Row>
			<ItemList>
				{columns.map((col) => 
					<Item
						key={col.key}
						isSelected={col.visible}
					>
						<input
							type='checkbox'
							checked={col.visible}
							onChange={() => upsertTableColumn(tableView, col.key, !col.visible)}
						/>
						<span>{col.label || col.key}</span>
					</Item>
				)}
			</ItemList>
		</React.Fragment>
	)
}

_ColumnSelectorDropdown.propTypes = {
	tableView: PropTypes.string.isRequired,
	tableConfig: PropTypes.object,
	toggleTableFixed: PropTypes.func.isRequired,
	upsertTableColumn: PropTypes.func.isRequired,
}

const dataSet = 'comments'
const ColumnSelectorDropdown = connect(
	(state, ownProps) => {
		const tableView = state[dataSet].ui.view;
		const tableConfig = state[dataSet].ui.tablesConfig[tableView];
		return {
			tableView,
			tableConfig
		}
	},
	(dispatch, ownProps) => ({
		toggleTableFixed: (view) => dispatch(toggleTableFixed(dataSet, view)),
		upsertTableColumn: (view, key, visible) => dispatch(setTableColumnVisible(dataSet, view, {key, visible}))
	})
)(_ColumnSelectorDropdown);

function ColumnSelector() {
	return (
		<ActionButtonDropdown
			name='columns'
			title='Configure table'
		>
			<ColumnSelectorDropdown />
		</ActionButtonDropdown>
	)
}

export default ColumnSelector;
