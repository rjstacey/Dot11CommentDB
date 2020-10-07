import React from 'react';
import PropTypes from 'prop-types';
import {shouldComponentUpdate} from 'react-window';

import styled from '@emotion/styled'

const defaultCellRenderer = ({rowData, key}) => rowData[key];

const BodyRow = styled.div`
	display: flex;
	position: relative;
	box-sizing: border-box;`


/**
 * TableRow component for AppTable
 */
class TableRow extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			measured: false
		};
	}

	/* This function knows to compare individual style props and ignore the wrapper object in order
	 * to avoid unnecessarily re-rendering when cached style objects are reset. */
	shouldComponentUpdate = shouldComponentUpdate.bind(this);

	componentDidMount() {
		this._measureHeight(true);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.measured && prevState.measured) {
			this.setState({ measured: false }, () => this._measureHeight());
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
			isExpanded,
			selected,
			setSelected,
			estimatedRowHeight,
			onRowHeightChange,
			onRowClick,
			onRowDoubleClick,
			...otherProps
		} = this.props;
		/* eslint-enable no-unused-vars */

		const cells = columns.map((column, columnIndex) => {
			const cellRenderer = column.cellRenderer || defaultCellRenderer
			const cellProps = {rowIndex, columnIndex, rowData, rowKey, key: column.key, column, selected, setSelected}
			const cellStyle = {
				flexBasis: column.width,
				flexGrow: fixed? 0: column.flexGrow,
				flexShrink: fixed? 0: column.flexShrink,
				overflow: 'hidden'	// necessary so that the content does not affect size
			}
			return (
				<div className='AppTable__dataCell' key={columnIndex} style={cellStyle}>
					{cellRenderer(cellProps)}
				</div>
			)
		})

		let rowStyle = {...style}
		if (!this.state.measured && isExpanded) {
			delete rowStyle.height
		}

		const onClick = onRowClick? event => onRowClick({event, rowIndex, rowData}): undefined
		const onDoubleClick = onRowDoubleClick? event => onRowDoubleClick({event, rowIndex, rowData}): undefined

	  	return (
			<BodyRow
				{...otherProps}
				ref={ref => this.ref = ref}
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
		if (!this.ref) return;

		const { style, onRowHeightChange, rowIndex, estimatedRowHeight, isExpanded } = this.props;
		const height = isExpanded? this.ref.getBoundingClientRect().height: estimatedRowHeight;
		this.setState({ measured: true }, () => {
			if (initialMeasure || height !== style.height)
				onRowHeightChange(rowIndex, height);
		});
	}
}

TableRow.propTypes = {
	fixed: PropTypes.bool,
	style: PropTypes.object,
	className: PropTypes.string,
	columns: PropTypes.arrayOf(PropTypes.object).isRequired,
	rowIndex: PropTypes.number.isRequired,
	rowData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	estimatedRowHeight: PropTypes.number,
	onRowHeightChange: PropTypes.func.isRequired
};

export default TableRow;