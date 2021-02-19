import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import {VariableSizeGrid as Grid} from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import TableRow from './AppTableRow'
import TableHeader from './AppTableHeader'
import {debounce, getScrollbarSize} from '../lib/utils'

import {setSelected} from '../store/actions/select'
import {uiInitTable, uiSetTableColumns} from '../store/actions/ui'
import {getDataMap} from '../store/selectors/dataMap'

const scrollbarSize = getScrollbarSize();

const Table = styled.div`
	display: flex;
	flex-direction: column-reverse;
	align-items: center;
	position: relative;
	:focus {
		outline: none;
	}
	.AppTable__headerRow,
	.AppTable__dataRow {
		display: flex;
		flex-flow: row nowrap;
		box-sizing: border-box;
	}
	.AppTable__headerContainer,
	.AppTable__headerRow {
		background-color: #efefef;
	}
	.AppTable__dataRow {
		padding: 5px 0;
		overflow: hidden;
	}
	.AppTable__dataRow-even {
		background-color: #fafafa;
	}
	.AppTable__dataRow-odd {
		background-color: #f6f6f6;
	}
	.AppTable__dataRow-selected {
		background-color: #b9b9f7;
	}
	.AppTable__headerCell {
		box-sizing: border-box;
	}
	.AppTable__dataCell {
		padding-right: 10px;
		box-sizing: border-box;
		align-self: start;
	}
`;

const NoRowsBody = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

class AppTableSized extends React.PureComponent {

	constructor(props) {
		super(props);

		let tableConfig
		if (!props.tableConfig) {
			tableConfig = props.defaultTableConfig || {fixed: false, columns: Immutable.Map()};
			props.initTableConfig(tableConfig.fixed, tableConfig.columns);
			//console.log('init', props.defaultTableConfig, tableConfig)
		}
		else {
			tableConfig = props.tableConfig;
			//console.log('state', tableConfig)
		}

		let columns = props.columns
			.map((col, key) => (tableConfig.columns.has(key)? {...col, width: tableConfig.columns.get(key).width}: col));
		this.state = {columns};

		this.fixed = tableConfig.fixed;

		this._resetIndex = null;
		this._rowHeightMap = {};
		this._rowHeightMapBuffer = {};
		this.updateRowHeights = debounce(() => {
			this._rowHeightMap = {...this._rowHeightMap, ...this._rowHeightMapBuffer};
			this._rowHeightMapBuffer = {};
			if (this.gridRef)
				this.gridRef.resetAfterRowIndex(this._resetIndex, true);
			this._resetIndex = null;
    	}, 0);
	}

	/*componentDidMount() {
		console.log('table mount')
	}*/

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.width !== this.props.width && this.gridRef) {
			this.gridRef.resetAfterColumnIndex(0, true);
		}
	}

	componentWillUnmount() {
		//console.log('unmount and emit')
		const columns = this.state.columns.map((col, key) => ({width: col.width}));
		this.props.setTableColumns(columns);
	}

	setColumnWidth = (key, deltaX) => {
		this.setState(
			(state, props) => ({columns: state.columns.update(key, c => ({...c, width: c.width + deltaX}))}),
			() => this.gridRef && this.gridRef.resetAfterColumnIndex(0, true)
		);
	}

    onRowHeightChange = (rowIndex, height) => {
    	if (this._resetIndex === null || this._resetIndex > rowIndex)
    		this._resetIndex = rowIndex;
    	this._rowHeightMapBuffer = {...this._rowHeightMapBuffer, [rowIndex]: height};
    	this.updateRowHeights();
    }

    getRowHeight = (rowIndex) => this._rowHeightMap[rowIndex] || this.props.estimatedRowHeight;

    // Sync the table header scroll position with that of the table body
	handleScroll = ({scrollLeft, scrollTop}) => {if (this.headerRef) this.headerRef.scrollLeft = scrollLeft};

	handleKeyDown = (event) => {
		const {data, dataMap, selected, setSelected, rowKey} = this.props;

		if (!selected)
			return

		// Ctrl-A selects all
		if ((event.ctrlKey || event.metaKey) && event.keyCode === 65) {
			setSelected(dataMap.map(i => data[i][rowKey]));
			event.preventDefault();
		}
		else if (event.keyCode === 38 || event.keyCode === 40) {

			if (selected.length === 0) {
				if (dataMap.length > 0)
					setSelected([data[dataMap[0]][rowKey]])
				return
			}

			let id = selected[0]
			let i = dataMap.findIndex(i => data[i][rowKey] === id)
			if (i === -1) {
				if (dataMap.length > 0)
					setSelected([data[dataMap[0]][rowKey]])
				return
			}

			if (event.keyCode === 38) {			// Up arrow
				if (i === 0) 
					i = dataMap.length - 1;
				else
					i = i - 1 
			}
			else {	// Down arrow
				if (i === (dataMap.length - 1))
					i = 0
				else
					i = i + 1
			}

			if (this.gridRef)
				this.gridRef.scrollToItem({rowIndex: i})

			setSelected([data[dataMap[i]][rowKey]])
		}
	}

	handleClick = ({event, rowData}) => {
		const {data, dataMap, selected, setSelected, rowKey} = this.props

		if (!selected)
			return

		let ids = selected.slice()
		const id = rowData[rowKey]
		if (event.shiftKey) {
			// Shift + click => include all between last and current
			if (ids.length === 0) {
				ids.push(id)
			}
			else {
				const id_last = ids[ids.length - 1]
				const i_last = dataMap.findIndex(i => data[i][rowKey] === id_last)
				const i_selected = dataMap.findIndex(i => data[i][rowKey] === id)
				if (i_last >= 0 && i_selected >= 0) {
					if (i_last > i_selected) {
						for (let i = i_selected; i < i_last; i++) {
							ids.push(data[dataMap[i]][rowKey])
						}
					}
					else {
						for (let i = i_last + 1; i <= i_selected; i++) {
							ids.push(data[dataMap[i]][rowKey])
						}
					}
				}
			}
		} else if (event.ctrlKey || event.metaKey) {
			// Control + click => add or remove
			if (ids.includes(id)) {
				ids = ids.filter(s => s !== id)
			}
			else {
				ids.push(id)
			}
		} else {
			ids = [id]
		}
		setSelected(ids)
	}

	render() {
		const {props} = this
		let totalWidth = 0;
		this.state.columns.forEach(col => totalWidth = totalWidth + col.width);

		let {width, height} =  props;
		if (!width) {
			// If width is not given, then size to content
			width = totalWidth + scrollbarSize
		}
		const containerWidth = width;
		//if (width > (totalWidth + scrollbarSize)) {
		//	width = totalWidth + scrollbarSize
		//}

		// put header after body and reverse the display order via css
		// to prevent header's shadow being covered by body
		return (
			<Table role='table' style={{height, width: containerWidth}} onKeyDown={this.handleKeyDown} tabIndex={0}>
				{props.data.length?
					<Grid
						ref={ref => this.gridRef = ref}
						height={height - props.headerHeight}
						width={width}
						columnCount={1}
						columnWidth={() => (this.fixed? totalWidth: width - scrollbarSize)}
						rowCount={props.dataMap.length}
						estimatedRowHeight={props.estimatedRowHeight}
						rowHeight={this.getRowHeight}
						onScroll={this.handleScroll}
					>
						{({rowIndex, style}) => {
							const rowKey = props.rowKey
							const rowData = props.rowGetter? 
								props.rowGetter({rowIndex, data: props.data, dataMap: props.dataMap}): 
								props.data[props.dataMap[rowIndex]]
								
							//console.log(rowData)
							const isSelected = props.selected && props.selected.includes(rowData[props.rowKey]);
							const isExpanded = props.expanded && props.expanded.includes(rowData[props.rowKey]);

							// Add appropriate row classNames
							let classNames = ['AppTable__dataRow']
							classNames.push((rowIndex % 2 === 0)? 'AppTable__dataRow-even': 'AppTable__dataRow-odd')
							if (isSelected)
								classNames.push('AppTable__dataRow-selected')

							return (
								<TableRow
									key={rowKey? rowData[rowKey]: rowIndex}
									className={classNames.join(' ')}
									style={style}
									fixed={this.fixed}
									rowIndex={rowIndex}
									rowData={rowData}
									rowKey={props.rowKey}
									dataSet={props.dataSet}
									isExpanded={isExpanded}
									columns={this.state.columns}
									estimatedRowHeight={props.estimatedRowHeight}
									onRowHeightChange={this.onRowHeightChange}
									onRowClick={this.handleClick}
									onRowDoubleClick={props.onRowDoubleClick}
								/>
							)
						}}
					</Grid>:
					<NoRowsBody style={{height: height - props.headerHeight, width}}>
						{props.loading? 'Loading...': 'No Data'}
					</NoRowsBody>
				}
				<TableHeader
					ref={ref => this.headerRef = ref}
					fixed={this.fixed}
					outerStyle={{width, height: props.headerHeight, paddingRight: scrollbarSize}}
					innerStyle={{width: this.fixed? totalWidth + scrollbarSize: '100%'}}
					scrollbarSize={scrollbarSize}
					columns={this.state.columns}
					setColumnWidth={this.setColumnWidth}
					setTableWidth={this.props.resizeWidth}
					dataSet={props.dataSet}
					rowKey={props.rowKey}
				/>
			</Table>
		)
	}
}

/*
 * AppTable
 */
function AppTable(props) {
	return (
		<AutoSizer>
			{({height, width}) => <AppTableSized height={height} width={width} {...props} />}
		</AutoSizer>
	)
}

AppTable.propTypes = {
	columns: PropTypes.object.isRequired,
	dataSet: PropTypes.string.isRequired,
	data: PropTypes.array.isRequired,
	dataMap: PropTypes.array.isRequired,
	selected: PropTypes.array,
	expanded: PropTypes.array,
	rowGetter: PropTypes.func,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	headerHeight: PropTypes.number.isRequired,
	estimatedRowHeight: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	onRowClick: PropTypes.func,
	onRowDoubleClick: PropTypes.func,
}

export default connect(
	(state, ownProps) => {
		const {dataSet, tableView} = ownProps;
		return {
			selected: state[dataSet].selected,
			expanded: state[dataSet].expanded,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			data: ownProps.data? ownProps.data: state[dataSet][ownProps.dataSet],
			dataMap: ownProps.dataMap? ownProps.dataMap: getDataMap(state, dataSet),
			tableConfig: state[dataSet].ui.tablesConfig? state[dataSet].ui.tablesConfig[tableView]: undefined
		}
	},
	(dispatch, ownProps) => {
		const {dataSet, tableView} = ownProps;
		return {
			setSelected: ids => dispatch(setSelected(dataSet, ids)),
			initTableConfig: (fixed, columns) => dispatch(uiInitTable(dataSet, tableView, fixed, columns)),
			setTableColumns: (columns) => dispatch(uiSetTableColumns(dataSet, tableView, columns))
		}
	}
)(AppTable)
