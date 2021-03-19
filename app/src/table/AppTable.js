import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {VariableSizeGrid as Grid} from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import TableRow from './AppTableRow'
import TableHeader from './AppTableHeader'
import ColumnDropdown from './ColumnDropdown'

import {debounce, getScrollbarSize} from '../lib/utils'

import {getSelected, setSelected} from '../store/selected'
import {getExpanded} from '../store/expanded'
import {getTableConfig, upsertTableColumns} from '../store/ui'
import {getSortedFilteredData} from '../store/dataSelectors'

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

const NoGrid = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

class AppTableSized extends React.PureComponent {

	constructor(props) {
		super(props);

		const {tableConfig} = props;

		//console.log(props.columns)
		const columns = props.columns.map(
			(col) => (
				(tableConfig.columns[col.key] && tableConfig.columns[col.key].width)
					? {...col, width: tableConfig.columns[col.key].width}
					: col
			)
		);
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
		const columnsConfig = this.state.columns.reduce((cfg, col) => ({...cfg, [col.key]: {width: col.width}}), {});
		this.props.upsertTableColumns(this.props.tableView, columnsConfig);
	}

	setColumnWidth = (key, deltaX) => {
		this.setState(
			(state, props) => {
				const columns = state.columns.map(c =>
					c.key === key? {...c, width: c.width + deltaX}: c)
				return {...state, columns}
			},
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
		const {data, selected, setSelected, rowKey} = this.props;

		if (!selected)
			return

		// Ctrl-A selects all
		if ((event.ctrlKey || event.metaKey) && event.keyCode === 65) {
			setSelected(data.map(d => d[rowKey]));
			event.preventDefault();
		}
		else if (event.keyCode === 38 || event.keyCode === 40) {

			if (selected.length === 0) {
				if (data.length > 0)
					setSelected([data[0][rowKey]]);
				return;
			}

			let id = selected[0];
			let i = data.findIndex(d => d[rowKey] === id);
			if (i === -1) {
				if (dataMap.length > 0)
					setSelected([data[0][rowKey]]);
				return;
			}

			if (event.keyCode === 38) {			// Up arrow
				if (i === 0)
					i = data.length - 1;
				else
					i = i - 1 
			}
			else {	// Down arrow
				if (i === (data.length - 1))
					i = 0
				else
					i = i + 1
			}

			if (this.gridRef)
				this.gridRef.scrollToItem({rowIndex: i})

			setSelected([data[i][rowKey]])
		}
	}

	handleClick = ({event, rowData}) => {
		const {data, selected, setSelected, rowKey} = this.props

		if (!selected)
			return;

		let ids = selected.slice();
		const id = rowData[rowKey];
		if (event.shiftKey) {
			// Shift + click => include all between last and current
			if (ids.length === 0) {
				ids.push(id);
			}
			else {
				const id_last = ids[ids.length - 1]
				const i_last = data.findIndex(d => d[rowKey] === id_last)
				const i_selected = data.findIndex(d => d[rowKey] === id)
				if (i_last >= 0 && i_selected >= 0) {
					if (i_last > i_selected) {
						for (let i = i_selected; i < i_last; i++) {
							ids.push(data[i][rowKey]);
						}
					}
					else {
						for (let i = i_last + 1; i <= i_selected; i++) {
							ids.push(data[i][rowKey]);
						}
					}
				}
			}
		}
		else if (event.ctrlKey || event.metaKey) {
			// Control + click => add or remove
			if (ids.includes(id)) {
				ids = ids.filter(s => s !== id);
			}
			else {
				ids.push(id);
			}
		}
		else {
			ids = [id]
		}
		setSelected(ids);
	}

	render() {
		const {props} = this
		let totalWidth = 0;
		//this.state.columns.forEach(col => totalWidth = totalWidth + col.width);
		//for (let col of Object.values(this.state.columns))
		//	totalWidth = totalWidth + col.width;
		totalWidth = this.state.columns.reduce((totalWidth, col) => totalWidth = totalWidth + col.width, 0)

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
						rowCount={props.data.length}
						estimatedRowHeight={props.estimatedRowHeight}
						rowHeight={this.getRowHeight}
						onScroll={this.handleScroll}
					>
						{({rowIndex, style}) => {
							const rowKey = props.rowKey
							const rowData = props.rowGetter 
								? props.rowGetter({rowIndex, data: props.data})
								: props.data[rowIndex];
							const rowId = rowKey? rowData[rowKey]: rowIndex;
								
							//console.log(rowData)
							const isSelected = props.selected && props.selected.includes(rowId);
							const isExpanded = props.expanded && props.expanded.includes(rowId);

							// Add appropriate row classNames
							let classNames = ['AppTable__dataRow']
							classNames.push((rowIndex % 2 === 0)? 'AppTable__dataRow-even': 'AppTable__dataRow-odd')
							if (isSelected)
								classNames.push('AppTable__dataRow-selected')

							return (
								<TableRow
									key={rowId}
									className={classNames.join(' ')}
									style={style}
									fixed={this.fixed}
									rowIndex={rowIndex}
									rowData={rowData}
									rowKey={rowKey}
									isExpanded={isExpanded}
									columns={this.state.columns}
									estimatedRowHeight={props.estimatedRowHeight}
									onRowHeightChange={this.onRowHeightChange}
									onRowClick={this.handleClick}
								/>
							)
						}}
					</Grid>:
					<NoGrid style={{height: height - props.headerHeight, width}}>
						{props.loading? 'Loading...': 'No Data'}
					</NoGrid>
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
					rowKey={props.rowKey}
					defaultHeaderCellRenderer={(p) => <ColumnDropdown dataSet={props.dataSet} {...p}/>}
				/>
			</Table>
		)
	}
}

/*
 * AppTable
 */
function _AppTable(props) {
	return (
		<AutoSizer>
			{({height, width}) => <AppTableSized height={height} width={width} {...props} />}
		</AutoSizer>
	)
}

_AppTable.propTypes = {
	columns: PropTypes.array.isRequired,
	dataSet: PropTypes.string.isRequired,
	data: PropTypes.array.isRequired,
	selected: PropTypes.array,
	expanded: PropTypes.array,
	rowGetter: PropTypes.func,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	headerHeight: PropTypes.number.isRequired,
	estimatedRowHeight: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	onRowClick: PropTypes.func,
}

const AppTable = connect(
	(state, ownProps) => {
		const {dataSet} = ownProps;
		const tableView = state[dataSet].ui.view;
		const tableConfig = state[dataSet].ui.tablesConfig[tableView];
		return {
			selected: getSelected(state, dataSet),
			expanded: getExpanded(state, dataSet),
			loading: state[dataSet].loading,
			data: getSortedFilteredData(state, dataSet),
			tableView,
			tableConfig,
		}
	},
	(dispatch, ownProps) => {
		const {dataSet} = ownProps;
		return {
			setSelected: ids => dispatch(setSelected(dataSet, ids)),
			upsertTableColumns: (view, columns) => dispatch(upsertTableColumns(dataSet, view, columns))
		}
	}
)(_AppTable)

AppTable.propTypes = {
	dataSet: PropTypes.string.isRequired,
	columns: PropTypes.array.isRequired,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	rowGetter: PropTypes.func,
	headerHeight: PropTypes.number.isRequired,
	estimatedRowHeight: PropTypes.number.isRequired,
	onRowClick: PropTypes.func,
}

export default AppTable;
