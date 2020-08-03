import PropTypes from 'prop-types'
import React from 'react'
import {DraggableCore} from 'react-draggable'
import {IconSort} from '../general/Icons'
import {SortType, SortDirection, isSortable} from '../reducers/sort'
import styled from '@emotion/styled'
import cn from 'classnames'
import Select from 'react-dropdown-select'


const StyledSelect = styled(Select)`
	background-color: white;
	border: 1px solid #ddd;
	padding: 0;
	box-sizing: border-box;`

export function ColumnDropdownFilter({dataKey, filter, setFilter, options, genOptions, width}) {

	const onChange = (values) => {
		setFilter(values.map(v => v.value))
	}

	const values = Array.isArray(filter.values)?
		filter.values.map(v => options.find(o => o.value === v)):
		[]

	return (
			<StyledSelect
				style={{width: width}}
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

const SearchFilter = styled.input`
	background-color: #ffffff;
	border: 1px solid #ddd;
	box-sizing: border-box;
	min-height: 28px;
	background-color: white;
	:placeholder-shown {
		background: right center no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28' %3E%3Cpath fill-opacity='.2' d='m 0,0 7.5,11.25 0,7.5 2.5,3.75 0,-11.25 7.5,-11.25 Z'%3E%3C/path%3E%3C/svg%3E");
	}
	:hover {
		border-color: #0074D9;
	}
	.invalid {
		background-color: red;
	}`

export function ColumnSearchFilter({className, dataKey, label, filter, setFilter, width, style}) {

	if (!filter) {
		return null
	}

	return (
		<SearchFilter
			className={cn(className, {invalid: !filter.valid})}
			type='search'
			placeholder=' '//'Filter'
			onChange={e => setFilter(e.target.value)}
			value={filter.values}
			style={style}
		/>
	)
}

const HeaderLabel = styled.div`
	display: block;
	user-select: none;
	position: relative;
	width: 100%;
	font-weight: bold;
	.icon {
		position: relative;
		top: -2px;
	}`
const LabelText = styled.div`
	display: inline-block;
	white-space: nowrap;
	overflow: hidden;`

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

	return (
		<HeaderLabel
			title={label}
			style={sortable? {cursor: 'pointer'}: {}}
			onClick={onClick}
			{...otherProps}
		>
			<LabelText style={{width: direction === SortDirection.NONE? '100%': 'calc(100% - 14px)'}}>{label}</LabelText>
			{direction !== 'NONE' && <IconSort className='icon' isAlpha={isAlpha} direction={direction} />}
		</HeaderLabel>
	)
}

function defaultHeaderCellRenderer({column, sort, setSort, filters, setFilter}) {
	const {key, label} = column
	return (
		<React.Fragment>
			<ColumnLabel
				dataKey={key}
				label={label}
				sort={sort}
				setSort={setSort}
			/>
			<ColumnSearchFilter
				style={{width: '100%'}}
				dataKey={key}
				filter={filters[key]}
				setFilter={(value) => setFilter(key, value)}
			/>
		</React.Fragment>
	)
}

const FlexRow = styled.div`
	display: flex;
	flex-direction: row;`

const DragHandle = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	cursor: col-resize;
	color: #0085ff;
	:hover,
	.dragging {
		color: #0b6fcc;
		background-color: rgba(0, 0, 0, 0.1)
	}`

function ResizableHeaderCell({width, setWidth, children, ...otherProps}) {
	const [drag, setDrag] = React.useState(false)
	return (
		<FlexRow {...otherProps}>
			<div style={{height: '100%', width: 'calc(100% - 12px)'}}>
				{children}
			</div>
			<DraggableCore
				axis="x"
				onDrag={(event, {deltaX}) => setWidth(width + deltaX)}
				onStart={e => setDrag(true)}
				onStop={e => setDrag(false)}
			>
				<DragHandle className={cn(drag && 'dragging')} style={{height: '100%', width: '12px'}}>
					<span>⋮</span>
				</DragHandle>
			</DraggableCore>
		</FlexRow>
	)
}

const HeaderContainer = styled.div`
	overflow: hidden;
	box-sizing: border-box;`

const HeaderRow = styled.div`
	display: flex;
	box-sizing: border-box;
	height: 100%;`

/**
 * TableHeader component for AppTable
 */
const TableHeader = React.forwardRef(({
	className,
	fixed,
	width,
	height,
	columns,
	setColumnWidth,
	filters,
	setFilter,
	sort,
	setSort,
	selected,
	setSelected,
	data,
	dataMap,
	rowGetter,
	rowKey,
	...otherProps}, ref) => {

	const totalWidth = columns.reduce((acc, col) => acc + col.width, 0);

	const cells = columns.map((column, columnIndex) => {
		const containerStyle = {
			flexBasis: column.width,
			flexGrow: fixed? 0: column.flexGrow,
			flexShrink: fixed? 0: column.flexShrink
		}
		const cellRenderer = column.headerRenderer || defaultHeaderCellRenderer
		const cellProps = {columnIndex, column, data, dataMap, rowGetter, rowKey, sort, setSort, filters, setFilter, selected, setSelected}
		return (
			<ResizableHeaderCell
				key={columnIndex}
				className='AppTable__headerCell'
				style={containerStyle}
				width={column.width}
				setWidth={width => setColumnWidth(columnIndex, width)}
			>
				{cellRenderer(cellProps)}
			</ResizableHeaderCell>
		)
	})

	const classNames = [className, 'AppTable__headerRow'].join(' ')

	return (
		<HeaderContainer
		 	ref={ref}
			style={{height, width}}
		>
			<HeaderRow
				className={classNames}
				style={{width: fixed? totalWidth: width, height}}
			>
				{cells}
			</HeaderRow>
		</HeaderContainer>
	)
})

TableHeader.propTypes = {
	fixed: PropTypes.bool,
	columns: PropTypes.array.isRequired,
	setColumnWidth: PropTypes.func.isRequired,
}

export default TableHeader
