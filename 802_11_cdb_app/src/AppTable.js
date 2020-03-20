import PropTypes from 'prop-types'
import React, {useState, useMemo, useEffect, useLayoutEffect} from 'react'
import update from 'immutability-helper'
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized'
import Draggable from 'react-draggable'
import cx from 'classnames'
import {allSelected, toggleVisible} from './filter'
import {IconSort} from './Icons'
import styles from './AppTable.css'

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

export function renderFilter({dataKey, filter, setFilter}) {
	const className = cx({
		[styles.headerFilt]: true,
		[styles.headerFiltInvalid]: filter && !filter.valid
	})
	return (
		<input
			type='search'
			className={className}
			placeholder=' '//'Filter'
			onChange={e => setFilter(dataKey, e.target.value)}
			value={filter.filtStr}
		/>
	)
}

export function renderLabel({dataKey, label, sortable, sortBy, sortDirection, setSort}) {
	let direction = 'NONE'
	let onClick = undefined
	if (sortable) {
		if (sortBy.includes(dataKey)) {
			direction = sortDirection[dataKey]
		}
		onClick = e => setSort(dataKey, e)
	}
	return (
		<div
			className={cx(styles.headerLabel, {[styles.headerLabelSort]: sortable})}
			title={label}
			onClick={onClick}
		>
			<div className={cx(styles.headerLabelItem, {[styles.headerLabelItemTrucate]: direction !== 'NONE'})}>{label}</div>
			{direction !== 'NONE' && <IconSort className={styles.headerLabelIcon} direction={direction} />}
		</div>
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

	function renderHeaderCell({columnData, dataKey, label}) {
		const showFilter = columnData.filters.hasOwnProperty(dataKey)
		const filter = columnData.filters[dataKey]
		const {sortable, sortBy, sortDirection, setSort} = columnData

		const defaultHeader = (
			<React.Fragment>
				{renderLabel({dataKey, label, sortable, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey, filter, setFilter: columnData.setFilter})}
			</React.Fragment>
		)

		if (columnData.isLast) {
			return (
				<div className={styles.headerLabelBox} style={{flex: '0 0 100%'}}>
					{columnData.headerRenderer? columnData.headerRenderer({dataKey, columnData}): defaultHeader}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div className={styles.headerLabelBox} style={{flex: '0 0 calc(100% - 12px)'}}>
					{columnData.headerRenderer? columnData.headerRenderer({dataKey, columnData}): defaultHeader}
				</div>
				<Draggable
					axis="x"
					defaultClassName={styles.headerDrag}
					defaultClassNameDragging={styles.dragHandleActive}
					onDrag={(event, {deltaX}) => resizeColumn({dataKey, deltaX})}
					position={{x: 0}}
					zIndex={999}
				>
					<span className={styles.dragHandleIcon}>⋮</span>
				</Draggable>
			</React.Fragment>
		)
	}

	function renderHeaderCellCheckbox({dataKey}) {
		const {dataMap, data, primaryDataKey} = props

		let elements = []
		if (Array.isArray(props.selected)) {
			const {selected, showSelected, setSelected} = props
			const isChecked = allSelected(selected, dataMap, data, primaryDataKey)
			const isIndeterminate = !isChecked && selected.length > 0
			const onChange = showSelected?
				showSelected:
				() => setSelected(toggleVisible(selected, dataMap, data, primaryDataKey));

			elements.push(
				<input
					key='selector'
					className={styles.checkbox}
					type="checkbox"
					title="Select All"
					checked={isChecked}
					ref={el => el && (el.indeterminate = isIndeterminate)}
					onChange={onChange}
				/>
			)
		}
		if (Array.isArray(props.expanded)) {
			const {expanded, setExpanded} = props
			const isExpanded = allSelected(expanded, dataMap, data, primaryDataKey)
			elements.push(
				<input
					key='expander'
					className={styles.doubleExpandable}
					type="checkbox"
					title="Expand All"
					checked={isExpanded}
					onChange={e => {
						setExpanded(toggleVisible(expanded, dataMap, data, primaryDataKey))
						clearAllCachedRowHeight()
					}}
				/>
			)
		}
		return (
			<div>
				<div>{dataMap.length}</div>
				{elements}	
			</div>
		)
	}

	function renderDataCellCheckbox({rowIndex, rowData, dataKey}) {
		const id = rowData[props.primaryDataKey]
		let elements = []
		if (Array.isArray(props.selected)) {
			const {selected, setSelected} = props
			const isSelected = selected.includes(id)
			elements.push(
				<input
					key='selector'
					className={styles.checkbox}
					type="checkbox"
					title="Select Row"
					checked={isSelected}
					onChange={e => {
						const i = selected.indexOf(id)
						setSelected(update(selected, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]}))
					}}
				/>
			)
		}
		if (Array.isArray(props.expanded)) {
			const {expanded, setExpanded} = props
			const isExpanded = expanded.includes(id)
			elements.push(
				<input
					key='expander'
					className={styles.expandable}
					type="checkbox"
					title="Expand Row"
					checked={isExpanded}
					onChange={e => {
						const i = expanded.indexOf(id)
						setExpanded(update(expanded, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]}))
						clearCachedRowHeight(rowIndex)
					}}
				/>
			)
		}
		return elements
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
		return <div className={styles.noRows}>{props.loading? 'Loading...': 'No rows'}</div>
	}

	function rowClassName({index}) {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	let column0
	if (Array.isArray(props.selected) || Array.isArray(props.expanded)) {
		column0 = (
			<Column 
				dataKey=''
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
			className={styles.Table}
			height={height}
			width={width}
			rowHeight={rowHeightCache.rowHeight}
			headerHeight={props.headerHeight? props.headerHeight: 44}
			noRowsRenderer={renderNoRows}
			headerClassName={styles.headerColumn}
			rowClassName={rowClassName}
			rowCount={props.dataMap.length}
			rowGetter={props.rowGetter || rowGetter}
			onRowDoubleClick={props.editRow}
			ref={(ref) => tableRef = ref}
		>
			{column0}

			{props.columns.map((col, index) => {
				const {cellRenderer, headerRenderer, width, ...otherProps} = col;
				return (
					<Column 
						key={index}
						columnData={{...col, filters: props.filters, setFilter: props.setFilter, sortBy: props.sortBy, sortDirection: props.sortDirection, setSort: props.setSort}}
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
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired,
	setFilter: PropTypes.func.isRequired,
	primaryDataKey: PropTypes.string,
	showSelected: PropTypes.func,
	setSelected: PropTypes.func,
	selected: PropTypes.array,
	setExpanded: PropTypes.func,
	expanded: PropTypes.oneOfType([PropTypes.bool, PropTypes.array])
}

export default AppTable