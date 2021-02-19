import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'

import {Expander, DoubleExpander, Handle} from '../general/Icons'
import useClickOutside from '../lib/useClickOutside'
import {Checkbox} from '../general/Form'

import {setSelected, toggleSelected} from '../store/actions/select'
import {setExpanded, toggleExpanded} from '../store/actions/expand'
import {getDataMap} from '../store/selectors/dataMap'


const CustomSelectorDropdown = styled.div`
	position: absolute;
	min-width: 400px;
	margin: 10px 10px 0;
	line-height: 30px;
	padding-left: 20px;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 3px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	z-index: 9;
`;

function renderDropdown({style, close, anchorRef, children}) {
	return ReactDOM.createPortal(
		<CustomSelectorDropdown style={style}>
			{React.cloneElement(children, { close })}
		</CustomSelectorDropdown>,
		anchorRef.current
	)
}

const CustomSelectorContainer = styled.div`
	height: 22px;
	border-radius: 6px;
	text-align: center;
`;

function CustomSelector(props) {
	const {anchorRef, children} = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const [position, setPosition] = React.useState({top: 0, left: 0});

	const toggleOpen = () => {
		if (!isOpen) {
			// Update position on open
			const anchor = anchorRef.current.getBoundingClientRect();
			const container = wrapperRef.current.getBoundingClientRect();
			const top = container.y - anchor.y + container.height;
			const left = container.x - anchor.x;
			setPosition(position => (top !== position.top || left !== position.left)? {top, left}: position);
		}
		setIsOpen(!isOpen);
	}

	const handleClose = (e) => {
		// ignore if not open or event target is an element inside the dropdown
		if (!isOpen || (anchorRef && anchorRef.current.lastChild.contains(e.target)))
			return;
		setIsOpen(false);
	}

	const wrapperRef = React.useRef();
	useClickOutside(wrapperRef, handleClose);

	return (
		<CustomSelectorContainer
			ref={wrapperRef}
		>
			<Handle title="Select List" open={isOpen} onClick={toggleOpen} />
			{isOpen && renderDropdown({style: position, close: handleClose, anchorRef, children})}
		</CustomSelectorContainer>
	)
}

const Selector = styled.div`
	display: flex;
	flex-direction: column;
	border-radius: 3px;
	align-items: center;
	:hover,
	:focus-within {
		background-color: #ddd;
	}
`;

const Container = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
`;

const _ControlHeader = (props) => {
	const {rowKey, data, dataMap, selected, setSelected, expanded, setExpanded, children} = props;

	const allSelected = React.useMemo(() => (
			dataMap.length > 0 &&	// not if list is empty
			dataMap.filter(i => !selected.includes(data[i][rowKey])).length === 0
		),
		[data, dataMap, selected, rowKey]
	);

	const isIndeterminate = !allSelected && selected.length;

	const allExpanded = React.useMemo(() => (
			expanded &&
			dataMap.length > 0 &&	// not if list is empty
			dataMap.filter(i => !expanded.includes(data[i][rowKey])).length === 0
		),
		[data, dataMap, expanded, rowKey]
	);

	const toggleAllSelected = () => setSelected(selected.length? []: dataMap.map(i => data[i][rowKey]));

	const toggleAllExpanded = () => setExpanded(expanded.length? []: dataMap.map(i => data[i][rowKey]));

	return (
		<Container>
			<Selector>
				<Checkbox
					title={allSelected? "Clear all": isIndeterminate? "Clear selected": "Select all"}
					checked={allSelected}
					indeterminate={isIndeterminate}
					onChange={toggleAllSelected}
				/>
				{children &&
					<CustomSelector
						anchorRef={props.anchorRef}
						children={children}
					/>}
			</Selector>
			{expanded &&
				<DoubleExpander
					title="Expand All"
					open={allExpanded}
					onClick={toggleAllExpanded}
				/>
			}
		</Container>
	)
}

export const ControlHeader = connect(
	(state, ownProps) => ({
		selected: state[ownProps.dataSet].selected,
		expanded: state[ownProps.dataSet].expanded,
		data: state[ownProps.dataSet][ownProps.dataSet],
		dataMap: getDataMap(state, ownProps.dataSet),
	}),
	(dispatch, ownProps) => ({
		setSelected: ids => dispatch(setSelected(ownProps.dataSet, ids)),
		setExpanded: ids => dispatch(setExpanded(ownProps.dataSet, ids))
	})
)(_ControlHeader);

const _ControlCell = ({rowKey, rowData, selected, toggleSelected, expanded, toggleExpanded}) => {
	const id = rowData[rowKey]
	return (
		<Container onClick={e => e.stopPropagation()} >
			<Checkbox
				title="Select row"
				checked={selected.includes(id)}
				onChange={() => toggleSelected(id)}
			/>
			{expanded && 
				<Expander
					title="Expand row"
					open={expanded.includes(id)}
					onClick={() => toggleExpanded(id)}
				/>
			}
		</Container>
	)
}

_ControlCell.propTypes = {
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	dataSet: PropTypes.string.isRequired,
	selected: PropTypes.array.isRequired,
	toggleSelected: PropTypes.func.isRequired,
	expanded: PropTypes.array,
	toggleExpanded: PropTypes.func,
}

export const ControlCell = connect(
	(state, ownProps) => ({
		selected: state[ownProps.dataSet].selected,
		expanded: state[ownProps.dataSet].expanded
	}),
	(dispatch, ownProps) => ({
		toggleSelected: id => dispatch(toggleSelected(ownProps.dataSet, [id])),
		toggleExpanded: id => dispatch(toggleExpanded(ownProps.dataSet, [id]))
	})
)(_ControlCell)
