import React from 'react';
import PropTypes from 'prop-types';
import {shouldComponentUpdate} from 'react-window';

function defaultCellRenderer({rowData, column}) {
	return rowData[column.dataKey]
}

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
			className,
			style,
			columns,
			rowIndex,
			rowData,
			estimatedRowHeight,
			onRowHeightChange,
			...otherProps
		} = this.props;
		/* eslint-enable no-unused-vars */

		// Add appropriate row classNames
		let classNames = [className]
		classNames.push((rowIndex % 2 === 0)? 'AppTable__row-even': 'AppTable__row-odd')
		if (rowData.Selected)
			classNames.push('AppTable__row-selected')
		classNames = classNames.join(' ')

		const cells = columns.map((column, columnIndex) => {
			const cellRenderer = column.cellRenderer || defaultCellRenderer
			const cellProps = {rowIndex, rowData, columnIndex, column}
			const cellStyle = {
				width: column.width,
				flexGrow: fixed? 0: column.flexGrow,
				flexShrink: fixed? 0: column.flexShrink
			}
			return (
				<div key={columnIndex} style={cellStyle}>
					{cellRenderer(cellProps)}
				</div>
			)
		})

		let rowStyle = {...style}
		if (!this.state.measured)
			delete rowStyle.height
		rowStyle.display = 'flex'

	  	return (
			<div
				{...otherProps}
				ref={ref => this.ref = ref}
				className={classNames}
				style={rowStyle}
			>
				{cells}
			</div>
		)
	}

	_measureHeight(initialMeasure) {
		if (!this.ref) return;

		const { style, onRowHeightChange, rowIndex } = this.props;
		const height = this.ref.getBoundingClientRect().height;
		this.setState({ measured: true }, () => {
			if (initialMeasure || height !== style.height)
				onRowHeightChange(rowIndex, height);
		});
	}
}

TableRow.propTypes = {
	className: PropTypes.string,
	style: PropTypes.object,
	columns: PropTypes.arrayOf(PropTypes.object).isRequired,
	rowData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
	rowIndex: PropTypes.number.isRequired,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	estimatedRowHeight: PropTypes.number,
	onRowHeightChange: PropTypes.func.isRequired
};

export default TableRow;