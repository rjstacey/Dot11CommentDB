import PropTypes from 'prop-types'
import React from 'react'
import {DraggableCore} from 'react-draggable'
import styled from '@emotion/styled'
import ColumnDropdown from './ColumnDropdown'

const defaultHeaderCellRenderer = (props) => <ColumnDropdown {...props}/>

const HeaderCell = styled.div`
	display: flex;
`;

const HeaderCellContent = styled.div`
	height: 100%;
	width: calc(100% - 12px)
`;

const ResizeHandle = styled.div`
	height: 100%;
	width: 12px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	cursor: col-resize;
	color: #0085ff;
	::after {
		content: "⋮";
	}
	:hover,
	.dragging {
		color: #0b6fcc;
		background-color: rgba(0, 0, 0, 0.1)
	}
`;

function ColumnResizer({style, setWidth}) {
	const [drag, setDrag] = React.useState(false)
	const nodeRef = React.useRef(null);
	return (
		<DraggableCore
			axis="x"
			onDrag={(event, {deltaX}) => setWidth(deltaX)}
			onStart={e => setDrag(true)}
			onStop={e => setDrag(false)}
			nodeRef={nodeRef}
		>
			<ResizeHandle
				ref={nodeRef}
				style={style}
				className={drag? 'dragging': undefined}
			/>
		</DraggableCore>
	)
}

const HeaderAnchor = styled.div`
	position: relative;
`;

const HeaderContainer = styled.div`
	overflow: hidden;
	box-sizing: border-box;
`;

const HeaderRow = styled.div`
	display: flex;
	box-sizing: border-box;
	height: 100%;
`;

/**
 * TableHeader component for AppTable
 *
 * HeaderCellAnchor is of zero width and provides an attachment point (outside the 'overflow: hidden') for dropdown overlays
 * HeaderCell containst the header cell content and column resizer
 */
 const TableHeader = React.forwardRef(({
	className,
	outerStyle,
	innerStyle,
	fixed,
	columns,
	setColumnWidth,
	setTableWidth,
	rowKey,
	dataSet}, ref) => {

	const anchorRef = React.useRef();

	const cells = columns.map((column, key) => {
		const {headerRenderer, width, flexGrow, flexShrink, ...colProps} = column;
		const style = {
			flexBasis: width,
			flexGrow: fixed? 0: flexGrow,
			flexShrink: fixed? 0: flexShrink,
			overflow: 'hidden'	// necessary so that the content does not affect size
		}
		const renderer = headerRenderer || defaultHeaderCellRenderer
		const props = {anchorRef, dataKey: key, column, rowKey, dataSet, ...colProps}
		return (
			<HeaderCell
				key={key}
				className='AppTable__headerCell'
				style={style}
			>
				<HeaderCellContent>
					{renderer(props)}
				</HeaderCellContent>
				<ColumnResizer
					setWidth={deltaX => setColumnWidth(key, deltaX)}
				/>
			</HeaderCell>
		)
	}).toArray()

	const classNames = [className, 'AppTable__headerRow'].join(' ')

	return (
		<HeaderAnchor ref={anchorRef}>
			<HeaderContainer
			 	ref={ref}
			 	className='AppTable__headerContainer'
				style={outerStyle}
			>
				<HeaderRow
					className={classNames}
					style={innerStyle}
				>
					{cells}
				</HeaderRow>
				{setTableWidth &&
					<ColumnResizer 
						style={{position: 'absolute', right: 0, top: 0}}
						setWidth={setTableWidth}
					/>}
			</HeaderContainer>
		</HeaderAnchor>
	)
})

TableHeader.propTypes = {
	className: PropTypes.string,
	outerStyle: PropTypes.object,
	innerStyle: PropTypes.object,
	fixed: PropTypes.bool,
	columns: PropTypes.object.isRequired,
	setColumnWidth: PropTypes.func.isRequired,
	setTableWidth: PropTypes.func,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	dataSet: PropTypes.string.isRequired,
}

export default TableHeader
