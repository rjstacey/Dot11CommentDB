import PropTypes from 'prop-types'
import React from 'react'
import {VariableSizeGrid as Grid} from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import TableRow from './AppTableRow'
import TableHeader, {ColumnLabel, ColumnSearchFilter, ColumnDropdownFilter} from './AppTableHeader'
import ShowFilters from './ShowFilters'
import ColumnDropdown from './ColumnDropdown'
import {debounce, getScrollbarSize} from '../lib/utils'
import {allSelected, toggleVisible} from '../lib/select'
import {Checkbox} from '../general/Icons'
import styled from '@emotion/styled'

const scrollbarSize = getScrollbarSize();

const ControlHeader = ({rowKey, data, dataMap, selected, setSelected}) => {
	const isSelected = allSelected(selected, dataMap, data, rowKey)
	const isIndeterminate = !isSelected && selected.length

	return (
		<Checkbox
			title={isSelected? "Clear All": isIndeterminate? "Clear Selected": "Select All"}
			checked={isSelected}
			indeterminate={isIndeterminate}
			onChange={e => setSelected(toggleVisible(selected, dataMap, data, rowKey))}
		/>
	)
}

const ControlCell = ({rowData, rowKey, selected, setSelected}) => {
	const id = rowData[rowKey]
	//console.log(selected, rowKey, id)
	return (
		<Checkbox
			key='selector'
			title="Select Row"
			checked={selected.includes(id)}
			onChange={() => {
				const i = selected.indexOf(id)
				const s = selected.slice()
				if (i >= 0) {s.splice(i, 1)} else {s.push(id)}
				setSelected(s)
			}}
		/>
	)
}

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
	.AppTable__headerRow {
		background-color: white;
	}
	.AppTable__dataRow {
		padding: 5px 0;
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
	}
`;

const NoRowsBody = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;`


function AppTableSized(props) {
	const gridRef = React.createRef();
	const headerRef = React.createRef();
	const [columnsIn, setColumnsIn] = React.useState([]);
	const [columns, setColumns] = React.useState(() => props.columns.slice());

	const controlColumn = {
		key: '',
		width: 40, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <ControlHeader {...p} />,
		cellRenderer: p => <ControlCell {...p} />
	}

	// Detect changes to props.columns and reset column widths
	if (props.columns !== columnsIn) {
		setColumnsIn(props.columns);
		const columns = props.columns.slice();
		if (props.setSelected) {
			columns.unshift(controlColumn);
		}
		setColumns(columns);
		if (gridRef.current)
			gridRef.current.resetAfterColumnIndex(0, false);
	}

	function setColumnWidth(index, width) {
		setColumns(columns => {
			let newColumns = columns.slice();
			newColumns[index] = {...columns[index], width};
			gridRef.current.resetAfterColumnIndex(0, false);
			return newColumns
		})
	}

	let _resetIndex = null
	let _rowHeightMap = {}
	let _rowHeightMapBuffer = {}
	const updateRowHeights = debounce(() => {
		_rowHeightMap = {..._rowHeightMap, ..._rowHeightMapBuffer};
		_rowHeightMapBuffer = {};
		if (gridRef.current) {
			gridRef.current.resetAfterRowIndex(_resetIndex, false);
			gridRef.current.forceUpdate();
		}
		_resetIndex = null;
    }, 0);

    const onRowHeightChange = (rowIndex, height) => {
    	if (_resetIndex === null) _resetIndex = rowIndex;
    	else if (_resetIndex > rowIndex) _resetIndex = rowIndex;
    	_rowHeightMapBuffer = {..._rowHeightMapBuffer, [rowIndex]: height}
    	updateRowHeights();
    }

    const getRowHeight = (rowIndex) => _rowHeightMap[rowIndex] || props.estimatedRowHeight;

    // Sync the table header scroll position with that of the table body
	function handleScroll({scrollLeft}) {
		if (headerRef.current) {
			headerRef.current.scrollLeft = scrollLeft;
		}
	}

	const totalWidth = columns.reduce((acc, col) => acc + col.width, 0)
	let {width, height} =  props;
	if (!width) {
		// If width is not given, then size to content
		width = totalWidth + scrollbarSize
	}
	const containerWidth = width;
	if (width > (totalWidth + scrollbarSize)) {
		width = totalWidth + scrollbarSize
	}

	// put header after body and reverse the display order via css
	// to prevent header's shadow being covered by body
	return (
		<Table role='table' style={{height, width: containerWidth}} onKeyDown={props.onKeyDown} tabIndex={0}>
			{props.data.length?
				<Grid
					ref={gridRef}
					height={height - props.headerHeight}
					width={width}
					columnCount={1}
					columnWidth={() => (props.fixed? totalWidth: width - scrollbarSize)}
					rowCount={props.dataMap.length}
					estimatedRowHeight={props.estimatedRowHeight}
					rowHeight={getRowHeight}
					onScroll={handleScroll}
				>
					{({columnIndex, rowIndex, style}) => {
						const rowData = props.rowGetter? props.rowGetter({rowIndex}): props.data[props.dataMap[rowIndex]]
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
								key={rowIndex}
								className={classNames.join(' ')}
								fixed={props.fixed}
								rowIndex={rowIndex}
								rowData={rowData}
								rowKey={props.rowKey}
								isExpanded={isExpanded}
								style={style}
								columns={columns}
								estimatedRowHeight={props.estimatedRowHeight}
								onRowHeightChange={onRowHeightChange}
								onRowClick={props.onRowClick}
								onRowDoubleClick={props.onRowDoubleClick}
								selected={props.selected}
								setSelected={props.setSelected}
							/>
						)
					}}
				</Grid>:
				<NoRowsBody style={{height: height - props.headerHeight, width}}>
					{props.loading? 'Loading...': 'No Data'}
				</NoRowsBody>
			}
			<TableHeader
				ref={headerRef}
				fixed={props.fixed}
				outerStyle={{width, height: props.headerHeight, paddingRight: scrollbarSize}}
				innerStyle={{width: props.fixed? totalWidth + scrollbarSize: '100%'}}
				scrollbarSize={scrollbarSize}
				columns={columns}
				setColumnWidth={setColumnWidth}
				filters={props.filters}
				setFilter={props.setFilter}
				sort={props.sort}
				setSort={props.setSort}
				data={props.data}
				dataMap={props.dataMap}
				rowGetter={props.rowGetter}
				rowKey={props.rowKey}
				selected={props.selected}
				setSelected={props.setSelected}
			/>
			{props.showFilters &&
				<ShowFilters
					style={{width}}
					data={props.data}
					dataMap={props.dataMap}
					filters={props.filters}
					setFilter={props.setFilter}
					removeFilter={props.removeFilter}
					clearFilters={props.clearFilters}
				/>
			}
		</Table>
	)
}


/*
 * AppTable
 * Auto sized to container unless contentWidth is true, in which case width is size of content
 */
function AppTable(props) {
	return (
		<AutoSizer disableWidth={props.contentWidth}>
			{({height, width}) => <AppTableSized height={height} width={width} {...props} />}
		</AutoSizer>
	)
}

AppTable.propTypes = {
	contentWidth: PropTypes.bool,
	columns: PropTypes.array.isRequired,
	data: PropTypes.array.isRequired,
	dataMap: PropTypes.array.isRequired,
	rowGetter: PropTypes.func,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	headerHeight: PropTypes.number.isRequired,
	estimatedRowHeight: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	filters: PropTypes.object.isRequired,
	setFilter: PropTypes.func.isRequired,
	sort: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired,
	selected: PropTypes.array,
	expanded: PropTypes.array,
	onRowClick: PropTypes.func,
	onRowDoubleClick: PropTypes.func,
	showFilters: PropTypes.bool
}

export default AppTable
export {ColumnLabel, ColumnSearchFilter, ColumnDropdownFilter, ColumnDropdown}
