import PropTypes from 'prop-types';
import React, {useState, useEffect, useRef} from 'react';
import update from 'immutability-helper';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import Draggable from 'react-draggable';
import cx from 'classnames';
import {allSelected, toggleVisible} from './filter'
import {IconSort} from './Icons'
import styles from './AppTable.css';

function html_preserve_newline(text) {
	return typeof text === 'string'?
		text.split('\n').map((line, i, arr) => {
			const lline = <span key={i}>{line}</span>;
			if (i === arr.length - 1) {
				return lline;
			} else {
				return [lline, <br key={i + 'br'} />];
		}
	}):
	text;
}

function AppTable(props) {
	let tableRef = null;
	const [expanded, setExpanded] = useState([])

	const rowHeightCache = useRef(new CellMeasurerCache({
			minHeight: props.rowHeight,
			fixedWidth: true
		}))

	useEffect(clearAllCachedRowHeight, [props.columns])	// If column layout changes

	const [columnWidth, setColumnWidth] = useState({});
	useEffect(() => {
		/* Initialize column width */
		let newColumnWidth = {};
		for (let col of props.columns) {
			const {dataKey, width} = col
			if (dataKey && !columnWidth.hasOwnProperty(dataKey)) {
				newColumnWidth[dataKey] = width
			}
		}
		setColumnWidth(newColumnWidth)
	}, [props.columns])

	function clearCachedRowHeight(rowIndex) {
		// Clear all the column heights in the cache.
		for (let i = 0; i < props.columns.length; i++) {
			rowHeightCache.current.clear(rowIndex, i)
		}
		tableRef.recomputeRowHeights(rowIndex);
	}

	function clearAllCachedRowHeight() {
		rowHeightCache.current.clearAll()
		tableRef.recomputeRowHeights(0);
	}

	function resizeColumn({dataKey, deltaX}) {
		const width = columnWidth[dataKey] + deltaX
		setColumnWidth(update(columnWidth, {$set: {[dataKey]: width}}))
	}

	function rowGetter({index}) {
		return props.data[props.dataMap[index]];
	}

	function renderLabel({dataKey, label, columnData}) {
		if (columnData.sortable) {
			const sortDirection = props.sortBy.includes(dataKey)? props.sortDirection[dataKey]: 'NONE';
			return (
				<div
					className={styles.headerLabel}
					title={label}
					style={{cursor: 'pointer'}}
					onClick={e => props.sortChange(e, dataKey)}
				>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'NONE'? '100%': 'calc(100% - 13px)'}}>{label}</div>
					{sortDirection !== 'NONE' && <IconSort direction={sortDirection} />}
				</div>
			)
		}
		else {
			return (
				<div
					className={styles.headerLabel}
					title={label}
				>
					{label}
				</div>
			)
		}
	}

	function renderFilter({dataKey}) {
		const filter = props.filters[dataKey]
		const className = cx({
			[styles.headerFilt]: true,
			[styles.headerFiltInvalid]: filter && !filter.valid
		})
		return (
			<input
				type='search'
				className={className}
				placeholder=' '//'Filter'
				onChange={e => props.filterChange(e, dataKey)}
				value={filter.filtStr}
			/>
		)
	}

	function renderHeaderCell({columnData, dataKey, label}) {
		const col = columnData;
		const showFilter = props.filters.hasOwnProperty(dataKey);

		if (col.isLast) {
			return (
				<div className={styles.headerLabelBox} style={{flex: '0 0 100%'}}>
					{renderLabel({dataKey, label, columnData})}
					{showFilter && renderFilter({dataKey})}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div className={styles.headerLabelBox} style={{flex: '0 0 calc(100% - 12px)'}}>
					{renderLabel({dataKey, label, columnData})}
					{showFilter && renderFilter({dataKey})}
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
		const {dataMap, data, primaryDataKey} = props;

		let elements = [];
		if (props.hasRowSelector) {
			const {selected, showSelected} = props;
			const isChecked = allSelected(selected, dataMap, data, primaryDataKey);
			const isIndeterminate = !isChecked && selected.length > 0;
			const onChange = showSelected?
				showSelected:
				() => props.setSelected(toggleVisible(selected, props.dataMap, props.data, primaryDataKey));

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
		if (props.hasRowExpander) {
			const isExpanded = allSelected(expanded, dataMap, data, primaryDataKey);
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
		const id = rowData[props.primaryDataKey];
		let elements = []
		if (props.hasRowSelector) {
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
						// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
						const i = selected.indexOf(id);
						setSelected(update(selected, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]}))
					}}
				/>
			)
		}
		if (props.hasRowExpander) {
			const isExpanded = expanded.includes(id);
			elements.push(
				<input
					key='expander'
					className={styles.expandable}
					type="checkbox"
					title="Expand Row"
					checked={isExpanded}
					onChange={e => {
						const i = expanded.indexOf(id);
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
		var cell = columnData.cellRenderer? columnData.cellRenderer(cellProps): html_preserve_newline(rowData[dataKey]);
		if (!cell) {
			cell = ''
		}
		if (props.hasRowExpander) {
			const isExpanded = expanded.includes(rowData[props.primaryDataKey]);
			if (isExpanded) {
				return (
					<CellMeasurer
						cache={rowHeightCache.current}
						rowIndex={rowIndex}
						columnIndex={columnIndex}
						parent={parent}
						key={dataKey}
					>
						{cell}
					</CellMeasurer>
				)
			}
		}
		rowHeightCache.current.set(rowIndex, columnIndex, undefined, 0); // force to minHeight
		return cell;
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

	let columns = []
	if (props.hasRowSelector || props.hasRowExpander) {
		columns.push({
			dataKey: '', label: '',
			sortable: false,
			width: (props.hasRowSelector && props.hasRowExpander)? 40: 25,
			flexGrow: 0, flexShrink: 0,
			headerRenderer: renderHeaderCellCheckbox,
			cellRenderer: renderDataCellCheckbox
		})
	}
	columns = columns.concat(props.columns)

	return (
		<Table
			className={styles.Table}
			height={props.height}
			width={props.width}
			rowHeight={rowHeightCache.current.rowHeight}
			headerHeight={44}
			noRowsRenderer={renderNoRows}
			headerClassName={styles.headerColumn}
			rowClassName={rowClassName}
			rowCount={props.dataMap.length}
			rowGetter={props.rowGetter || rowGetter}
			onRowDoubleClick={props.editRow}
			ref={(ref) => tableRef = ref}
		>
			{columns.map((col, index) => {
				const {cellRenderer, headerRenderer, width, ...otherProps} = col;
				return (
					<Column 
						key={index}
						columnData={col}
						headerRenderer={headerRenderer? headerRenderer: renderHeaderCell}
						cellRenderer={renderMeasuredCell}
						width={columnWidth.hasOwnProperty(col.dataKey)? columnWidth[col.dataKey]: width}
						{...otherProps}
					/>
				)})}
		</Table>
	)
}

AppTable.propTypes = {
	hasRowSelector: PropTypes.bool,
	hasRowExpander: PropTypes.bool,
	columns: PropTypes.array.isRequired,
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	editRow: PropTypes.func,
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	sortChange: PropTypes.func.isRequired,
	filterChange: PropTypes.func.isRequired,
	primaryDataKey: PropTypes.string,
	showSelected: PropTypes.func,
	setSelected: PropTypes.func,
	selected: PropTypes.array,
}

export default AppTable;