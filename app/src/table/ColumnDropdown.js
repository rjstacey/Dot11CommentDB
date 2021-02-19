import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {FixedSizeList as List} from 'react-window'

import {Button, ActionButtonSort, Handle, IconSort, IconFilter} from '../general/Icons'
import useClickOutside from '../lib/useClickOutside'
import {Checkbox, Input} from '../general/Form'

import {SortType, sortOptions} from '../store/lib/sort'
import {getAllFieldOptions, getAvailableFieldOptions} from '../store/selectors/options'
import {setSort, SortDirection} from '../store/actions/sort'
import {setFilter, addFilter, removeFilter, FilterType} from '../store/actions/filter'

const StyledInput = styled(Input)`
	margin: 5px 10px;
	padding: 10px;
`;

const StyledList = styled(List)`
	min-height: 35px;
	max-height: 250px;
	border: 1px solid #ccc;
	border-radius: 3px;
	margin: 10px;
`;

const Item = styled.div`
	display: flex;
	align-items: center;
	${({ disabled }) => disabled && 'text-decoration: line-through;'}
	${({ isSelected }) => isSelected? 'background: #0074d9;': ':hover{background: #ccc;}'}
	& > div {
		margin: 5px 5px;
		${({ isSelected }) => isSelected && 'color: #fff;'}
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

const DropdownContainer = styled.div`
	position: absolute;
	min-width: 150px;
	padding: 10px;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 2px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	z-index: 9;
	:focus {outline: none}
`;

const Row = styled.div`
	margin: 5px 10px;
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

function Sort({
	sort,
	setSort
}) {
	const {direction, type} = sort;
	return (
		<Row>
			<label>Sort:</label>
			<span>
				<ActionButtonSort
					onClick={e => setSort(direction === SortDirection.ASC? SortDirection.NONE: SortDirection.ASC)}
					direction={SortDirection.ASC}
					isAlpha={type !== SortType.NUMERIC}
					isActive={direction === SortDirection.ASC}
				/>
				<ActionButtonSort
					onClick={e => setSort(direction === SortDirection.DESC? SortDirection.NONE: SortDirection.DESC)}
					direction={SortDirection.DESC}
					isAlpha={type !== SortType.NUMERIC}
					isActive={direction === SortDirection.DESC}
				/>
			</span>
		</Row>
	)
}

Sort.propTypes = {
	sort: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired
}

function Filter({
	rowKey,
	dataKey,
	sort,
	filter,
	setFilter,
	addFilter,
	removeFilter,
	allOptions,
	availableOptions,
	selected,
	dataRenderer,
	customFilterElement
}) {
	const [search, setSearch] = React.useState('');
	const inputRef = React.useRef();

	React.useEffect(() => {
		if (search === '//')
			inputRef.current.setSelectionRange(1, 1)
	}, [search]);

	const onInputKey = e => {
		if (e.key === 'Enter' && e.target.value)
			toggleItemSelected(items[0])
		if (e.key === '/' && !e.target.value) {
			// If search is empty and / is pressed, then add // to search
			// and position the cursor between the slashes (through useEffect on search change)
			e.preventDefault();
			setSearch('//');
		}
	}

	const isItemSelected = (item) => 
		filter.values.find(v => v.value === item.value && v.filterType === item.type) !== undefined

	const toggleItemSelected = (item) => {
		setSearch('');
		if (isItemSelected(item))
			removeFilter(item.value, item.type)
		else
			addFilter(item.value, item.type)
	}

	const options = filter.options?
		filter.options:
		filter.values.length > 0? allOptions: availableOptions;
	let searchItems = filter.values
		.filter(v => v.filterType !== FilterType.EXACT)
		.map(v => ({
			value: v.value,
			label: (v.filterType === FilterType.REGEX? 'Regex: ': 'Contains: ') + v.value.toString(),
			type: v.filterType
		}));
	let exactItems = options.map(o => ({...o, type: FilterType.EXACT}));
	if (search) {
		let regexp;
		const parts = search.split('/');
		if (search[0] === '/' && parts.length > 2) {
			// User is entering a regex in the form /pattern/flags.
			// If the regex doesn't validate then ignore it
			try {regexp = new RegExp(parts[1], parts[2])} catch (err) {}
			if (regexp) {
				exactItems = exactItems.filter(item => regexp.test(item.label))
				let item = {
					label: 'Regex: ' + regexp.toString(),
					value: regexp,
					type: FilterType.REGEX
				}
				searchItems.unshift(item)
			}
		}
		else {
			regexp = new RegExp(search, 'i');
			exactItems = exactItems.filter(item => regexp.test(item.label))
			let item = {
				label: 'Contains: ' + search,
				value: search,
				type: FilterType.CONTAINS
			}
			searchItems.unshift(item)
		}
	}

	exactItems = sortOptions(sort, exactItems)

	// Regex items at the top of the list
	const items = searchItems.concat(exactItems);

	const itemHeight = 35;
	const listHeight = Math.min(items.length * itemHeight, 200);

	return (
		<React.Fragment>
			<Row>
				<label>Filter:</label>
				{dataKey === rowKey &&
					<Button
						onClick={() => setFilter(selected)}
						disabled={selected.length === 0}
						isActive={filter.values.map(v => v.value).join() === selected.join()}
					>
						Selected
					</Button>}
				<Button
					onClick={() => setFilter([])}
					isActive={filter.values.length === 0}
				>
					Clear
				</Button>
			</Row>
			{customFilterElement}
			<StyledInput
				type='search'
				value={search}
				ref={inputRef}
				onChange={e => setSearch(e.target.value)}
				onKeyDown={onInputKey}
				placeholder="Search..."
			/>
			<StyledList
				height={listHeight}
				itemCount={items.length}
				itemSize={itemHeight}
				width='auto'
			>
				{({index, style}) => {
					const item = items[index];
					const isSelected = isItemSelected(item);
					return (
						<Item
							key={item.value}
							style={style}
							isSelected={isSelected}
							onClick={() => toggleItemSelected(item)}
						>
							<Checkbox checked={isSelected} readOnly />
							{dataRenderer? dataRenderer(item.label): <div>{item.label}</div>}
						</Item>
					)
				}}
			</StyledList>
		</React.Fragment>
	)
}

Filter.propTypes = {
	dataKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	sort: PropTypes.object.isRequired,
	filter: PropTypes.object.isRequired,
	setFilter: PropTypes.func.isRequired,
	addFilter: PropTypes.func.isRequired,
	removeFilter: PropTypes.func.isRequired,
	allOptions: PropTypes.array.isRequired,
	availableOptions: PropTypes.array.isRequired,
	selected: PropTypes.array,
	dataRenderer: PropTypes.func,
	customFilterElement: PropTypes.element,
}

function Dropdown({
	style,
	className,
	rowKey,
	dataKey,
	sort,
	setSort,
	filter,
	setFilter,
	addFilter,
	removeFilter,
	allOptions,
	availableOptions,
	close,
	dataSet,
	selected,
	dataRenderer,
	customFilterElement
}) {
	const containerRef = React.useRef();
	const [containerStyle, setContainerStyle] = React.useState(style);

	// Close the dropdown if the user scrolls
	// (we don't track position changes during scrolling)
	React.useEffect(() => {
		window.addEventListener('scroll', close, true);
		return () => window.removeEventListener('scroll', close);
	}, [close])

	React.useEffect(() => {
		// If the dropdown is outside the viewport, then move it
		const bounds = containerRef.current.getBoundingClientRect();
		/*if (bounds.x + bounds.width > window.innerWidth) {
			setContainerStyle(style => ({...style, left: window.innerWidth - bounds.width}))
		}*/
		if (bounds.x < 0)
			setContainerStyle(style => ({...style, left: 0, right: undefined}))
	}, [setContainerStyle]);

	return (
		<DropdownContainer
			ref={containerRef}
			style={containerStyle}
			className={className}
		>
			{sort &&
				<Sort
					sort={sort}
					setSort={setSort}
				/>
			}
			{filter &&
				<Filter
					rowKey={rowKey}
					dataKey={dataKey}
					selected={selected}
					sort={sort}
					filter={filter}
					setFilter={setFilter}
					addFilter={addFilter}
					removeFilter={removeFilter}
					allOptions={allOptions}
					availableOptions={availableOptions}
					dataRenderer={dataRenderer}
					customFilterElement={customFilterElement}
				/>
			}
		</DropdownContainer>
	);
}

const ConnectedDropdown = connect(
	(state, ownProps) => {
		const {dataSet, dataKey} = ownProps
		return {
			filter: state[dataSet].filters[dataKey],
			sort: state[dataSet].sort.sorts[dataKey],
			selected: state[dataSet].selected,
			allOptions: getAllFieldOptions(state, dataSet, dataKey),
			availableOptions: getAvailableFieldOptions(state, dataSet, dataKey)
		}
	},
	(dispatch, ownProps) => {
		const {dataSet, dataKey} = ownProps
		return {
			setFilter: (value) => dispatch(setFilter(dataSet, dataKey, value)),
			addFilter: (value, filterType) => dispatch(addFilter(dataSet, dataKey, value, filterType)),
			removeFilter: (value, filterType) => dispatch(removeFilter(dataSet, dataKey, value, filterType)),
			setSort: (direction) => dispatch(setSort(dataSet, dataKey, direction)),
		}
	}
)(Dropdown)

function renderDropdown({anchorRef, ...otherProps}) {
	return ReactDOM.createPortal(
		<ConnectedDropdown {...otherProps} />,
		anchorRef.current
	)
}

const Wrapper = styled.div`
	position: relative;
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	user-select: none;
	width: 100%;
	overflow: hidden;
	box-sizing: border-box;
	margin-right: 5px;
	:hover {color: tomato}
	& .handle {
		position: absolute;
		right: 0;
		background: inherit;
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
	}
`;

const Label = styled.label`
	font-weight: bold;
`;

function _ColumnDropdown(props) {
	const {className, style, filter, label, ...otherProps} = props;
	const {anchorRef, column, sort} = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const [position, setPosition] = React.useState({});

	const handleClose = (e) => {
		// ignore if not open or event target is an element inside the dropdown
		if (!isOpen || (anchorRef.current && anchorRef.current.lastChild.contains(e.target)))
			return;
		setIsOpen(false);
	}

	const toggleOpen = () => {
		if (!isOpen) {
			// Update position on open
			const anchor = anchorRef.current.getBoundingClientRect();
			const container = wrapperRef.current.getBoundingClientRect();
			const top = container.y - anchor.y + container.height;
			const right = (anchor.x + anchor.width) - (container.x + container.width);
			const width = props.dropdownWidth || column.width;
			const newPosition = {top, width};
			if ((right + width) > anchor.width)
				newPosition.left = 0;
			else
				newPosition.right = right;
			setPosition(newPosition);
		}
		setIsOpen(!isOpen);
	}

	const wrapperRef = React.useRef();
	useClickOutside(wrapperRef, handleClose);

	const isFiltered = filter && filter.values.length > 0;
	const isSorted = sort && sort.direction !== SortDirection.NONE;

	if (!sort && !filter) {
		return <Label>{label}</Label>
	}

	return (
		<Wrapper
			ref={wrapperRef}
			className={className}
			style={style}
		>
			<Header
				onClick={toggleOpen}
			>
				<Label>{label}</Label>
				<div className='handle'>
					{isFiltered &&
						<IconFilter
							style={{opacity: isFiltered? 0.2: 0}}
						/>}
					{isSorted && 
						<IconSort
							direction={sort.direction}
							isAlpha={sort.type !== SortType.NUMERIC}
							style={{opacity: 0.2, paddingRight: 4}}
						/>}
					<Handle />
				</div>
			</Header>
			{isOpen && renderDropdown({style: position, close: handleClose, ...otherProps})}
		</Wrapper>
	)
}

const ColumnDropdown = connect(
	(state, ownProps) => {
		const {dataSet, dataKey} = ownProps
		const filter = state[dataSet].filters[dataKey]
		const sort = state[dataSet].sort.sorts[dataKey]	
		return {
			sort,
			filter
		}
	}
)(_ColumnDropdown)

export default ColumnDropdown
