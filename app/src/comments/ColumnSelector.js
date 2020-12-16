import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {connect} from 'react-redux'
import {uiSetProperty, uiSetTableFixed, uiSetTableColumnVisible} from '../actions/ui'
import {ActionButton, Checkbox} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'

const Wrapper = styled(ClickOutside)`
	display: inline-block;
	user-select: none;
	position: relative;`

const PullDown = styled.div`
	z-index: 10;
	position: absolute;
	right: 0;
	width: 222px;
	border: 2px solid #dfdfdf;
	/*border-top: none;*/
	border-bottom-right-radius: 3px;
	border-bottom-left-radius: 3px;
	background-color: #fff;
	box-shadow: 0 2px 5px -1px #e8e8e8;
	max-height: 300px;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;`

const PullDownList = styled.ul`
	margin-block-start: 0;
	margin-block-end: 0;
	padding-inline-start: 5px;`

const PullDownListItem = styled.li`
	width: 100%;
	cursor: default;
	display: inline-block;
	white-space: nowrap;
	text-overflow: ellipsis;
	:selected {
		color: #fff;
		background-color: #ffcc01;
	}
	:hover {
		color: #fff;
		background-color: #ffcc01;
	}`


function ColumnSelector({
	tableView,
	setTableView,
	tableConfig,
	setTableFixed,
	setTableColumnVisible,
	allColumns
	}) {

	const [isOpen, setOpen] = React.useState(false)
	
	const columnsConfig = tableConfig[tableView].columns;
	const fixed = tableConfig[tableView].fixed;

	return (
		<Wrapper onClick={() => setOpen(!isOpen)} onClickOutside={() => setOpen(false)}>
			<ActionButton name='columns' title='Select Columns' onClick={() => setOpen(!isOpen)} />
			{isOpen &&
				<PullDown>
					<label><Checkbox checked={fixed} onChange={() => setTableFixed(tableView, !fixed)} />Fixed</label>
					<hr />
					<PullDownList>
						{allColumns.map((column, key) => {
							const cfg = columnsConfig.get(key);
							return cfg?
								<PullDownListItem key={key} onClick={() => setTableColumnVisible(tableView, key, !cfg.visible)}>
									{cfg.visible && '\u2714'} {column.label || key}
								</PullDownListItem>:
								null
						}).toArray()}
					</PullDownList>
				</PullDown>
			}
		</Wrapper>
	)
}

ColumnSelector.propTypes = {
	tableView: PropTypes.string.isRequired,
	tableConfig: PropTypes.object.isRequired,
	setTableView: PropTypes.func.isRequired,
	setTableFixed: PropTypes.func.isRequired,
	setTableColumnVisible: PropTypes.func.isRequired,
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => {
		return {
			tableView: state[dataSet].ui['tableView'],
			tableConfig: state[dataSet].ui['tableConfig'],
		}
	},
	(dispatch, ownProps) => ({
		setTableView: view => dispatch(uiSetProperty(dataSet, 'tableView', view)),
		setTableFixed: (view, isFixed) => dispatch(uiSetTableFixed(dataSet, view, isFixed)),
		setTableColumnVisible: (view, key, isVisible) => dispatch(uiSetTableColumnVisible(dataSet, view, key, isVisible))
	})
)(ColumnSelector);
