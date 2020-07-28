import PropTypes from 'prop-types'
import React from 'react'
import {DraggableCore} from 'react-draggable'
import {IconSort} from '../general/Icons'
import {SortType, SortDirection, isSortable} from '../reducers/sort'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import styled from '@emotion/styled'

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
		cursor: ${sortable? 'pointer': 'unset'};
		font-weight: bold`
	const headerLabelItem = css`
		display: inline-block;
		white-space: nowrap;
		overflow: hidden;
		width: ${direction === SortDirection.NONE? '100%': 'calc(100% - 14px)'};`
	const headerLabelIcon = css`
		position: relative;
		top: -2px;`
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

function defaultHeaderCellRenderer({columnIndex, column, sort, setSort, filters, setFilter}) {
	const {dataKey, label} = column
	return (
		<React.Fragment>
			<ColumnLabel dataKey={dataKey} label={label} sort={sort} setSort={setSort} />
			<ColumnSearchFilter css={css`width: 100%`} dataKey={dataKey} filter={filters[dataKey]} setFilter={(value) => setFilter(dataKey, value)} />
		</React.Fragment>
	)
}

function ResizableHeaderCell({width, flexGrow, flexShrink, setWidth, children, ...otherProps}) {
	const [drag, setDrag] = React.useState(false)
	const dragCss = css`
		display: flex;
		flex: 0 0 12px;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		cursor: col-resize;
		color: #0085ff;
		:hover {
			color: #0b6fcc;
			background-color: rgba(0, 0, 0, 0.1)
		}`

	const draggingCss = css`
		color: #0b6fcc;
		background-color: rgba(0, 0, 0, 0.1)`

	return (
		<div style={{display: 'flex', width: `${width}px`, flexGrow, flexShrink}} {...otherProps}>
			<div style={{flex: '0 0 calc(100% - 12px)', overflow: 'hidden'}}>
				{children}
			</div>
			<DraggableCore
				axis="x"
				onDrag={(event, {deltaX}) => setWidth(width + deltaX)}
				onStart={e => setDrag(true)}
				onStop={e => setDrag(false)}
			>
				<div css={[dragCss, drag && draggingCss]} style={{flex: '0 0 12px'}}>
					<span>⋮</span>
				</div>
			</DraggableCore>
		</div>
	)
}

const HeaderRow = styled.div`
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	box-sizing: border-box;`

function TableHeader({
	fixed,
	columns,
	setColumnWidth,
	filters,
	setFilter,
	sort,
	setSort,
	...otherProps}) {

	const cells = columns.map((column, columnIndex) => {
		const cellRenderer = column.headerRenderer || defaultHeaderCellRenderer
		const cellProps = {columnIndex, column, filters, setFilter, sort, setSort}			
		return (
			<ResizableHeaderCell
				key={columnIndex}
				width={column.width}
				flexGrow={fixed? 0: column.flexGrow}
				flexShrink={fixed? 0: column.flexShrink}
				setWidth={width => setColumnWidth(columnIndex, width)}
			>
				{cellRenderer(cellProps)}
			</ResizableHeaderCell>
		)
	})

	return (
		<HeaderRow {...otherProps}>
			{cells}
		</HeaderRow>
	)
}

TableHeader.propTypes = {
	fixed: PropTypes.bool,
	columns: PropTypes.array.isRequired,
	setColumnWidth: PropTypes.func.isRequired,
}

export default TableHeader
