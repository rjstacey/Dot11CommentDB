import PropTypes from 'prop-types'
import React, {useState, useEffect} from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import {VariableSizeList as List} from 'react-window'
import TableRow from './AppTableRow'
import TableHeader, {ColumnLabel, ColumnSearchFilter} from './AppTableHeader'
import {debounce} from '../lib/utils'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import styled from '@emotion/styled'

const tableCss = css`
	.AppTable__row-even {
		background-color: #fafafa;
	}
	.AppTable__row-odd {
		background-color: #f6f6f6;
	}
	.AppTable__row-selected {
		background-color: #b9b9f7;
	}`

const NoRowsBody = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 200px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;`


function AppTable(props) {
	const tableRef = React.createRef()

	const [columnWidths, setColumnWidths] = React.useState(props.columns.map(col => col.width))

	function setColumnWidth(index, width) {
		const newColumnWidths = columnWidths.slice()
		newColumnWidths[index] = width
		console.log(tableRef)
		//tableRef.current.resetAfterColumnIndex(index, false)
		setColumnWidths(newColumnWidths)
	}

	const columns = React.useMemo(() => props.columns.map((c, i) => ({...c, width: columnWidths[i]})), [props.columns, columnWidths])

	let _resetIndex = null
	let _rowHeightMap = {}
	let _rowHeightMapBuffer = {}
	const updateRowHeights = debounce(() => {
		_rowHeightMap = {..._rowHeightMap, ..._rowHeightMapBuffer};
		_rowHeightMapBuffer = {};
		if (tableRef.current) {
			tableRef.current.resetAfterIndex(_resetIndex, false);
			tableRef.current.forceUpdate();
		}
		_resetIndex = null;
    }, 0);

    const onRowHeightChange = (rowIndex, height) => {
    	if (_resetIndex === null) _resetIndex = rowIndex;
    	else if (_resetIndex > rowIndex) _resetIndex = rowIndex;
    	_rowHeightMapBuffer = {..._rowHeightMapBuffer, [rowIndex]: height}
    	updateRowHeights()
    }

    const estimatedRowHeight = 54

    const getRowHeight = (rowIndex) => {
    	return _rowHeightMap[rowIndex] || estimatedRowHeight;
    }

	const noRowsBody = <NoRowsBody>{props.loading? 'Loading...': 'No Data'}</NoRowsBody>

	/* Use the innerElementType prop to customize the List container.
	 * We want to add a sticky header and a no rows indication */
	const tableContainer = React.forwardRef(({children, ...rest}, ref) => {
		const containerProps = {
			...rest,
			style: {
				...rest.style,
				height: `${parseFloat(rest.style.height) + 66}px`
			}
		}
		const width = props.fixed? 'unset': '100%'	// if fixed, then constrain row width to continer width
		return (
			<div ref={ref} {...containerProps}>
				<TableHeader
					fixed={props.fixed}
					css={{position: 'sticky', top: 0, left: 0, height: props.headerHeight, width, zIndex: 2, backgroundColor: 'white'}}
					columns={columns}
					width={rest.style.width}
					height={props.headerHeight}
					setColumnWidth={setColumnWidth}
					filters={props.filters}
					setFilter={props.setFilter}
					sort={props.sort}
					setSort={props.setSort}
				/>
				<div style={{position: 'absolute', top: props.headerHeight, left: 0, height: rest.style.height, width, zIndex: 1}} >
					{children.length? children: noRowsBody}
				</div>
			</div>
		)
	})

	return (
		<List
			css={tableCss}
			height={props.height}
			width={props.width}
			itemCount={props.data.length}
			estimatedItemSize={estimatedRowHeight}
			itemSize={getRowHeight}
			innerElementType={tableContainer}
			ref={tableRef}
		>
			{({index, style}) => 
				<TableRow 
					key={index}
					fixed={props.fixed}
					rowIndex={index}
					rowData={props.rowGetter? props.rowGetter({rowIndex: index}): props.data[index]}
					style={style}
					columns={columns}
					estimatedRowHeight={estimatedRowHeight}
					onRowHeightChange={onRowHeightChange}
				/>
			}
		</List>
	)
}

AppTable.propTypes = {
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	columns: PropTypes.array.isRequired,
	data: PropTypes.array.isRequired,
	rowGetter: PropTypes.func,
	headerHeight: PropTypes.number.isRequired,
	loading: PropTypes.bool.isRequired,
	editRow: PropTypes.func,
	filters: PropTypes.object.isRequired,
	setFilter: PropTypes.func.isRequired,
	sort: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired,
	showSelected: PropTypes.func,
	selected: PropTypes.array,
	setSelected: PropTypes.func,
}

export default AppTable
export {ColumnLabel, ColumnSearchFilter}
