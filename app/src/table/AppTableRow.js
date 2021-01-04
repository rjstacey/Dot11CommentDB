import React from 'react';
import PropTypes from 'prop-types';
import {shouldComponentUpdate} from 'react-window';

import styled from '@emotion/styled'

const defaultCellRenderer = ({rowData, dataKey}) => rowData[dataKey];

const BodyRow = styled.div`
	display: flex;
	position: relative;
	box-sizing: border-box;
`;


/**
 * TableRow component for AppTable
 */
class TableRow extends React.Component {
	constructor(props) {
		super(props);
		this.state = {measured: false};
		this.rowRef = null;
	}

	/* This function knows to compare individual style props and ignore the wrapper object in order
	 * to avoid unnecessarily re-rendering when cached style objects are reset. */
	shouldComponentUpdate = shouldComponentUpdate.bind(this);

	componentDidMount() {
		this._measureHeight(true);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.measured && prevState.measured) {
			this.setState({measured: false}, () => this._measureHeight());
		}
	}

	render() {
		/* eslint-disable no-unused-vars */
		const {
			isScrolling,
			fixed,
			style,
			className,
			columns,
			rowIndex,
			rowData,
			rowKey,
			dataSet,
			isExpanded,
			estimatedRowHeight,
			onRowHeightChange,
			onRowClick,
			onRowDoubleClick,
			...otherProps
		} = this.props;
		/* eslint-enable no-unused-vars */

		const cells = columns.map((column, key) => {
			const {headerRenderer, cellRenderer, width, flexGrow, flexShrink, ...colProps} = column;
			const style = {
				flexBasis: width,
				flexGrow: fixed? 0: flexGrow,
				flexShrink: fixed? 0: flexShrink,
				overflow: 'hidden'	// necessary to ensure that the content does not affect size
			}
			const renderer = cellRenderer || defaultCellRenderer;
			const props = {rowIndex, rowData, dataSet, rowKey, dataKey: key, ...colProps}
			return (
				<div
					key={key}
					className='AppTable__dataCell'
					style={style}
				>
					{renderer(props)}
				</div>
			)
		}).toArray()

		let rowStyle = {...style}
		if (!this.state.measured && isExpanded) {
			delete rowStyle.height
		}

		const onClick = onRowClick? event => onRowClick({event, rowIndex, rowData}): undefined
		const onDoubleClick = onRowDoubleClick? event => onRowDoubleClick({event, rowIndex, rowData}): undefined

	  	return (
			<BodyRow
				{...otherProps}
				ref={ref => this.rowRef = ref}
				className={className}
				style={rowStyle}
				onClick={onClick}
				onDoubleClick={onDoubleClick}
			>
				{cells}
			</BodyRow>
		)
	}

	_measureHeight(initialMeasure) {
		if (!this.rowRef) return;

		const {style, onRowHeightChange, rowIndex, estimatedRowHeight, isExpanded} = this.props;
		const height = isExpanded? this.rowRef.getBoundingClientRect().height: estimatedRowHeight;
		this.setState({measured: true}, () => {
			if (initialMeasure || height !== style.height)
				onRowHeightChange(rowIndex, height);
		});
	}
}

TableRow.propTypes = {
	className: PropTypes.string,
	style: PropTypes.object,
	fixed: PropTypes.bool,
	columns: PropTypes.object.isRequired,
	rowIndex: PropTypes.number.isRequired,
	rowData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	estimatedRowHeight: PropTypes.number,
	onRowHeightChange: PropTypes.func.isRequired
};

export default TableRow;