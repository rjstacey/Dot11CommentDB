import PropTypes from 'prop-types'
import React, {useState, useMemo, useEffect, useLayoutEffect} from 'react'
import update from 'immutability-helper'
import {defaultTableRowRenderer, Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized'
import Draggable from 'react-draggable'
import Select from 'react-dropdown-select'
import {allSelected, toggleVisible} from '../lib/select'
import {IconSort, Handle, Expander, DoubleExpander, Checkbox} from './Icons'
import {SortType, SortDirection, isSortable} from '../reducers/sort'
import ClickOutside from '../general/ClickOutside'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'


function renderPreservingNewlines(text) {
	return typeof text === 'string'?
		text.split('\n').map((line, i, arr) => {
			const lline = <span key={i}>{line}</span>
			if (i === arr.length - 1) {
				return lline
			} else {
				return [lline, <br key={i + 'br'} />]
		}
	}):
	text
}

export function ColumnSearchFilter({className, dataKey, label, filter, setFilter, width}) {

	if (!filter) {
		return null
	}

	const inputCss = css`
		background-color: #ffffff;
		border: 1px solid #ddd;
		box-sizing: border-box;
		width: ${width? width + 'px': 'unset'};
		min-height: 28px;
		background-color: ${filter.valid? 'white': 'red'};
		:placeholder-shown {
			background: right center no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28' %3E%3Cpath fill-opacity='.2' d='m 0,0 7.5,11.25 0,7.5 2.5,3.75 0,-11.25 7.5,-11.25 Z'%3E%3C/path%3E%3C/svg%3E");
		}
		:hover {
			border-color: #0074D9;
		}`

	return (
			<input
				className={className}
				css={inputCss}
				type='search'
				placeholder=' '//'Filter'
				onChange={e => setFilter(e.target.value)}
				value={filter.values}
			/>
	)
}

export function ColumnDropdownFilter({dataKey, label, filter, setFilter, options, genOptions, width}) {

	const selectCss = css`
		background-color: white;
		border: 1px solid #ddd;
		padding: 0;
		box-sizing: border-box;
		min-width: ${width? width + 'px': 'unset'};
	`

	const onChange = (values) => {
		setFilter(values.map(v => v.value))
	}

	const values = Array.isArray(filter.values)?
		filter.values.map(v => options.find(o => o.value === v)):
		[]

	return (
			<Select
				css={selectCss}
				placeholder=""
				values={values}
				onChange={onChange}
				multi
				closeOnSelect
				onDropdownOpen={genOptions}
				options={options}
			/>
    )
}

export function ColumnLabel({dataKey, label, sort, setSort, ...otherProps}) {
	let direction = SortDirection.NONE, onClick, isAlpha
	const sortable = isSortable(sort, dataKey)
	if (sortable) {
		if (sort.by.includes(dataKey)) {
			direction = sort.direction[dataKey]
		}
		onClick = e => setSort(dataKey, e)
		isAlpha = sort.type[dataKey] !== SortType.NUMERIC
	}
	const headerLabel = css`
		display: block;
		user-select: none;
		position: relative;
		width: 100%;
		cursor: ${sortable? 'pointer': 'unset'};`
	const headerLabelItem = css`
		display: inline-block;
		white-space: nowrap;
		overflow: hidden;
		width: ${direction === SortDirection.NONE? '100%': 'calc(100% - 12px)'};`
	const headerLabelIcon = css`
		position: absolute;
		right: 0;
		top: 2px;`
	return (
		<div
			css={headerLabel}
			title={label}
			onClick={onClick}
			{...otherProps}
		>
			<div css={headerLabelItem}>{label}</div>
			{direction !== 'NONE' && <IconSort css={headerLabelIcon} isAlpha={isAlpha} direction={direction} />}
		</div>
	)
}

function RowSelector({renderSelector}) {
	const [open, setOpen] = React.useState(false)

	const containerCss = css`
		position: relative;
		height: 22px;
		border-radius: 6px;
		:hover,
		:focus,
		:focus-within {
			background-color: #ccc;
		}`
	const handleCss = css`
		border-radius: 6px;`
	const contentCss = css`
		position: absolute;
		top: 22px;
		left: -1px;
		min-width: 300px;
		border: 1px solid #ccc;
		padding: 0;
		background: #fff;
		border-radius: 2px;
		box-shadow: 0 0 10px 0 rgba(0,0,0,0.2);
		z-index: 9;`
	return (
		<ClickOutside css={containerCss} onClick={() => setOpen(!open)} onClickOutside={() => setOpen(false)}  >
			<Handle css={handleCss} title="Select List" open={open} onClick={(e) => {setOpen(!open); e.stopPropagation()}} />
			{open && renderSelector({css: contentCss})}
		</ClickOutside>
	)
}

export function renderDate({rowData, dataKey}) {
	// rowData[dataKey] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[dataKey])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

function useTableSize(getTableSize, dependencies) {
	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	})

	function onResize() {
		const {height, width} = getTableSize()
		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width})
		}
	}

	useLayoutEffect(() => {
		onResize()
		window.addEventListener("resize", onResize)
		return () => {
			window.removeEventListener("resize", onResize)
		}
	}, [])

	useEffect(onResize, dependencies)

	return tableSize
}

const tableCss = css`
	/*margin: 0 auto;*/
	align-items: center;

	.headerColumn {
		display: flex;
		flex-direction: row;
		text-transform: none;
		background-color: #fafafa;
	}

	.headerRow,
	.evenRow,
	.oddRow,
	.selectedRow {
		display: flex;
		flex-direction: row;
		box-sizing: border-box;
	}
	.headerRow {
		font-weight: bold;
	}
	.oddRow {
		background-color: #f6f6f6;
	}
	.selectedRow {
		background-color: #b9b9f7;
	}
`

function AppTable(props) {
	let tableRef = null

	const {height, width} = useTableSize(props.getTableSize, props.tableSizeDependencies || [])

	const rowHeightCache = useMemo(() => new CellMeasurerCache({
			defaultHeight: props.rowHeight,
			minHeight: props.rowHeight,
			fixedWidth: true
		}), [props.columns])

	const [columnWidth, setColumnWidth] = useState(initColumnWidths)

	function initColumnWidths() {
		return props.columns.reduce((obj, col) => ({...obj, [col.dataKey]: col.width}), {})
	}

	function clearCachedRowHeight(rowIndex) {
		// Clear all the column heights in the cache.
		for (let i = 0; i < props.columns.length; i++) {
			rowHeightCache.clear(rowIndex, i)
		}
		tableRef.recomputeRowHeights(rowIndex)
	}

	function clearAllCachedRowHeight() {
		rowHeightCache.clearAll()
		tableRef.recomputeRowHeights(0)
	}

	function resizeColumn({dataKey, deltaX}) {
		const width = columnWidth[dataKey] + deltaX
		setColumnWidth({...columnWidth, [dataKey]: width})
	}

	function rowGetter({index}) {
		return props.data[props.dataMap[index]]
	}

	/* We replace headerRowRender so that we can remove the "overflow: hidden" style property */
	function headerRowRenderer({className, columns, style}) {
		delete style.overflow
		return (
			<div className={className} role="row" style={style}>
				{columns}
			</div>
		)
	}

	function renderHeaderCell({columnData, dataKey, label}) {
		const dragCss = css`
			display: flex;
			flex: 0 0 12px;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			cursor: col-resize;
			color: #0085ff;
			:hover,
			.react-draggable-dragging {
				background-color: rgba(0, 0, 0, 0.1);
			}
			.react-draggable-dragging {
				color: #0b6fcc;
			}`
		const dragHandleIconCss = css`
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;`
		const filter = columnData.filters[dataKey]
		const {sort, setSort} = columnData

		const defaultHeader = (
			<React.Fragment>
				<ColumnLabel dataKey={dataKey} label={label} sort={sort} setSort={setSort} />
				<ColumnSearchFilter css={css`width: 100%`} dataKey={dataKey} filter={filter} setFilter={(value) => columnData.setFilter(dataKey, value)} />
			</React.Fragment>
		)

		if (columnData.isLast) {
			return (
				<div style={{flex: '0 0 100%'}}>
					{columnData.headerRenderer? columnData.headerRenderer({dataKey, label, columnData}): defaultHeader}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div style={{flex: '0 0 calc(100% - 12px)'}}>
					{columnData.headerRenderer? columnData.headerRenderer({dataKey, label, columnData}): defaultHeader}
				</div>
				<div css={dragCss}>
					<Draggable
						axis="x"
						onDrag={(event, {deltaX}) => resizeColumn({dataKey, deltaX})}
						position={{x: 0}}
						zIndex={999}
					>
						<span css={dragHandleIconCss}>⋮</span>
					</Draggable>
				</div>
			</React.Fragment>
		)
	}

	function renderHeaderCellCheckbox({dataKey, columnData}) {
		const {dataMap, data, primaryDataKey} = props
		const {selected, setSelected, expanded, setExpanded} = columnData

		let elements = []
		if (Array.isArray(selected)) {
			const {selector} = props
			const isChecked = allSelected(selected, dataMap, data, primaryDataKey)
			const isIndeterminate = !isChecked && selected.length > 0

			const containerCss = css`
				border-radius: 6px;
				:hover,
				:focus-within {
					background-color: #ddd;
				}`

			elements.push(
				<div key='selector' css={containerCss} style={{display: 'flex', flexDirection: 'row'}}>
					<Checkbox
						title={isChecked? "Clear All": isIndeterminate? "Clear Selected": "Select All"}
						checked={isChecked}
						indeterminate={isIndeterminate}
						onChange={() => setSelected(toggleVisible(selected, dataMap, data, primaryDataKey))}
					/>
					{selector && <RowSelector renderSelector={selector} />}
				</div>
			)
		}
		if (Array.isArray(expanded)) {
			const isExpanded = allSelected(expanded, dataMap, data, primaryDataKey)

			elements.push(
				<DoubleExpander
					key='expander'
					title="Expand All"
					open={isExpanded}
					onClick={e => {
						setExpanded(toggleVisible(expanded, dataMap, data, primaryDataKey))
						clearAllCachedRowHeight()
					}}
				/>
			)
		}

		return (
			<div style={{display: 'flex', flexDirection: 'column'}}>
				{elements}
			</div>
		)
	}

	function renderDataCellCheckbox({rowIndex, dataKey, rowData, columnData}) {
		const id = rowData[props.primaryDataKey]
		let elements = []
		if (Array.isArray(columnData.selected)) {
			const {selected, setSelected} = columnData
			const isSelected = selected.includes(id)
			elements.push(
				<Checkbox
					key='selector'
					title="Select Row"
					checked={isSelected}
					onChange={e => {
						const i = selected.indexOf(id)
						setSelected(update(selected, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]}))
					}}
				/>
			)
		}
		if (Array.isArray(columnData.expanded)) {
			const {expanded, setExpanded} = columnData
			const isExpanded = expanded.includes(id)
			elements.push(
				<Expander
					key='expander'
					title="Expand Row"
					open={isExpanded}
					onClick={e => {
						const i = expanded.indexOf(id)
						setExpanded(update(expanded, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]}))
						clearCachedRowHeight(rowIndex)
					}}
				/>
			)
		}
		const controlCss = css`
			display: flex;
			flex-direction: column;`
		return (
			<div css={controlCss}>
				{elements}	
			</div>
		)
	}
  
	function renderMeasuredCell(cellProps) {
		const {rowIndex, rowData, dataKey, columnIndex, columnData, parent} = cellProps
		var cell = columnData.cellRenderer? columnData.cellRenderer(cellProps): renderPreservingNewlines(rowData[dataKey]);
		if (!cell) {
			cell = ''
		}
		if (props.expanded === true || (Array.isArray(props.expanded) && props.expanded.includes(rowData[props.primaryDataKey]))) {
			return (
				<CellMeasurer
					cache={rowHeightCache}
					rowIndex={rowIndex}
					columnIndex={columnIndex}
					parent={parent}
					key={dataKey}
				>
					{cell}
				</CellMeasurer>
			)
		}
		else {
			rowHeightCache.set(rowIndex, columnIndex, undefined, 0) // force to minHeight
			return cell
		}
	}

	function renderNoRows() {
		const noRowsCss = css`
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1em;
			color: #bdbdbd;`
		return <div css={noRowsCss}>{props.loading? 'Loading...': 'No rows'}</div>
	}

	function rowClassName({index}) {
		if (index < 0) {
			return 'headerRow';
		}
		/*else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}*/
	}

	function rowRenderer(myProps) {
		let className
		const id = myProps.rowData[props.primaryDataKey]
		if (Array.isArray(props.selected) && props.selected.includes(id)) {
			className = 'selectedRow';
		}
		else {
			className = myProps.index % 2 === 0 ? 'evenRow' : 'oddRow';
		}
		className += ' ' + props.className
		return defaultTableRowRenderer({...myProps, className})
	}

	let column0
	if (Array.isArray(props.selected) || Array.isArray(props.expanded)) {
		const columnData = {
				selected: props.selected,
				setSelected: props.setSelected,
				expanded: props.expanded,
				setExpanded: props.setExpanded
			}
		column0 = (
			<Column 
				dataKey=''
				columnData={columnData}
				headerRenderer={renderHeaderCellCheckbox}
				cellRenderer={renderDataCellCheckbox}
				flexGrow={0}
				flexShrink={0}
				width={(Array.isArray(props.selected) && Array.isArray(props.expanded))? 40: 25}
			/>
		)
	}

	return (
		<Table
			fixed
			css={tableCss}
			height={height}
			width={width}
			rowHeight={rowHeightCache.rowHeight}
			headerHeight={props.headerHeight? props.headerHeight: 56}
			noRowsRenderer={renderNoRows}
			headerRowRenderer={headerRowRenderer}
			headerClassName='headerColumn'
			rowRenderer={rowRenderer}
			rowClassName={rowClassName}
			rowCount={props.dataMap.length}
			rowGetter={props.rowGetter || rowGetter}
			//onRowClick={(p) => {props.columns.length === 1 && props.editRow(p)}}
			onRowDoubleClick={props.editRow}
			ref={(ref) => tableRef = ref}
		>
			{column0}

			{props.columns.map((col, index) => {
				const {cellRenderer, headerRenderer, width, ...otherProps} = col;
				const columnData = {
					...col,
					filters: props.filters,
					setFilter: props.setFilter,
					sort: props.sort,
					setSort: props.setSort,
					selected: props.selected,
					setSelected: props.setSelected,
					expanded: props.expanded,
					setExpanded: props.setExpanded
				}
				return (
					<Column 
						key={index}
						columnData={columnData}
						headerRenderer={renderHeaderCell}
						cellRenderer={renderMeasuredCell}
						width={columnWidth.hasOwnProperty(col.dataKey)? columnWidth[col.dataKey]: width}
						{...otherProps}
					/>
				)}
			)}
		</Table>
	)
}

AppTable.propTypes = {
	columns: PropTypes.array.isRequired,
	getTableSize: PropTypes.func.isRequired,
	//height: PropTypes.number.isRequired,
	//width: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	editRow: PropTypes.func,
	filters: PropTypes.object.isRequired,
	setFilter: PropTypes.func.isRequired,
	sort: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired,
	primaryDataKey: PropTypes.string,
	showSelected: PropTypes.func,
	selected: PropTypes.array,
	setSelected: PropTypes.func,
	expanded: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]),
	setExpanded: PropTypes.func
}

export default AppTable