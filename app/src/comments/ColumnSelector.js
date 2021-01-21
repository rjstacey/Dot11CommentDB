import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {connect} from 'react-redux'

import {Button} from '../general/Icons'
import {ActionButtonDropdown} from '../general/Dropdown'

import {uiSetProperty, uiToggleTableFixed, uiSetTableColumnVisible} from '../store/actions/ui'

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
		setTableView,
		toggleTableFixed,
		setTableColumnVisible,
		allColumns
	}) {

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
				{allColumns.map((column, key) => {
					const visible = (tableConfig && tableConfig.columns.has(key))? tableConfig.columns.get(key).visible: true;
					return (
						<Item
							key={key}
							isSelected={visible}
						>
							<input
								type='checkbox'
								checked={visible}
								onChange={() => setTableColumnVisible(tableView, key, !visible)}
							/>
							<span>{column.label || key}</span>
						</Item>
					)
				}).toArray()}
			</ItemList>
		</React.Fragment>
	)
}

_ColumnSelectorDropdown.propTypes = {
	tableView: PropTypes.string.isRequired,
	tableConfig: PropTypes.object,
	setTableView: PropTypes.func.isRequired,
	toggleTableFixed: PropTypes.func.isRequired,
	setTableColumnVisible: PropTypes.func.isRequired,
}

const dataSet = 'comments'
const ColumnSelectorDropdown = connect(
	(state, ownProps) => {
		const tableView = state[dataSet].ui['tableView'];
		const tablesConfig = state[dataSet].ui['tablesConfig'];
		return {
			tableView,
			tableConfig: tablesConfig[tableView],
		}
	},
	(dispatch, ownProps) => ({
		setTableView: view => dispatch(uiSetProperty(dataSet, 'tableView', view)),
		toggleTableFixed: (view) => dispatch(uiToggleTableFixed(dataSet, view)),
		setTableColumnVisible: (view, key, isVisible) => dispatch(uiSetTableColumnVisible(dataSet, view, key, isVisible))
	})
)(_ColumnSelectorDropdown);

function ColumnSelector({
	allColumns
}) {
	return (
		<ActionButtonDropdown
			name='columns'
			title='Configure table'
		>
			<ColumnSelectorDropdown
				allColumns={allColumns}
			/>
		</ActionButtonDropdown>
	)
}

export default ColumnSelector;
