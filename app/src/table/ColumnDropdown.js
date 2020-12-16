import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {FixedSizeList as List} from 'react-window'
import {Button, ActionButtonSort, Handle} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'
import {getAllFieldOptions, getAvailableFieldOptions} from '../selectors/options'
import {setSort, isSortable, SortDirection} from '../actions/sort'
import {SortType, sortFunc} from '../lib/sort'
import {setFilter, addFilter, removeFilter, FilterType} from '../actions/filter'
import {CommentIdFilter} from '../comments/CommentIdList'

const SearchInput = styled.input`
	margin: 10px 10px 0;
	line-height: 30px;
	padding-left: 20px;
	border: 1px solid #ccc;
	border-radius: 3px;
	:focus {
		outline: none;
		border: 1px solid deepskyblue;
	}
`;

const StyledCommandIdFilter = styled(CommentIdFilter)`
	margin: 10px 10px 0;
	line-height: 30px;
	padding-left: 20px;
	border: 1px solid #ccc;
	border-radius: 3px;
	max-width: 300px;
	:focus {
		outline: none;
		border: 1px solid deepskyblue;
	}
`;

const StyledList = styled(List)`
	min-height: 10px;
	max-height: 200px;
	border: 1px solid #ccc;
	border-radius: 3px;
	margin: 10px;
	padding: 10px;
`;

const Item = styled.div`
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	${({ disabled }) => disabled && 'text-decoration: line-through;'}
	${({ isSelected }) => isSelected? 'background: #0074d9;': ':hover{background: #ccc;}'}
	& > span {
		margin: 5px 5px;
		${({ isSelected }) => isSelected && 'color: #fff;'}
	}
`;

const DropdownContainer = styled.div`
	position: absolute;
	padding: 10px;
	display: flex;
	flex-direction: column;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 2px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	z-index: 9;
	:focus {
		outline: none;
	}
}
`;

const Header = styled(ClickOutside)`
	position: relative;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	user-select: none;
	width: 100%;
	overflow: hidden;
	box-sizing: border-box;
	& label {
		font-weight: bold;
	}
	.handle {
		position: absolute;
		right: 0;
		bottom: 0;
		background: #fff;
	}
`;

function Sort({
	dataKey,
	sort,
	setSort
}) {
	const direction = sort.direction[dataKey]
	return (
		<span>Sort:
			<span>
				<ActionButtonSort
					onClick={e => setSort(dataKey, direction === SortDirection.ASC? SortDirection.NONE: SortDirection.ASC)}
					direction={SortDirection.ASC}
					isAlpha={sort.type[dataKey] !== SortType.NUMERIC}
					isActive={direction === SortDirection.ASC}
				/>
				<ActionButtonSort
					onClick={e => setSort(dataKey, direction === SortDirection.DESC? SortDirection.NONE: SortDirection.DESC)}
					direction={SortDirection.DESC}
					isAlpha={sort.type[dataKey] !== SortType.NUMERIC}
					isActive={direction === SortDirection.DESC}
				/>
			</span>
		</span>
	)
}

Sort.propTypes = {
	dataKey: PropTypes.string.isRequired,
	sort: PropTypes.object.isRequired,
	setSort: PropTypes.func.isRequired
}


function Filter({
	dataKey,
	sortType,
	filter,
	setFilter,
	addFilter,
	removeFilter,
	allOptions,
	availableOptions,
	selected
}) {
	const [search, setSearch] = React.useState('')
	const regexp = new RegExp(search, 'i');

	const isItemSelected = (item) => filter.values.find(v => v.value === item.value) !== undefined

	const allClear = filter.values.length === 0;

	const matchesSelected = filter.values.join() === selected.join();

	const clearAllItems = () => setFilter([]);

	const cmpFunc = sortFunc[sortType];
	const options = filter.options?
		filter.options:
		filter.values.length > 0? allOptions: availableOptions;
	const items = options
		.filter((item) => regexp.test(item.label))
		.sort((itemA, itemB) => cmpFunc(itemA.value, itemB.value))
		.map((item, index) => {
			const isSelected = isItemSelected(item);
			return {
				label: item.label,
				isSelected: isItemSelected(item),
				onChange: () => isSelected? removeFilter(item.value, FilterType.EXACT): addFilter(item.value, FilterType.EXACT)
			}
		})

	if (search) {
		let addSearch
		if (filter.type === FilterType.PAGE)
			addSearch = () => addFilter(search, FilterType.PAGE)
		else if (filter.type === FilterType.CLAUSE)
			addSearch = () => addFilter(search, FilterType.CLAUSE)
		else 
			addSearch = () => addFilter(search, FilterType.CONTAINS)
		items.unshift({
			label: 'Contains: ' + search,
			isSelected: false,
			onChange: addSearch
		})
	}

	if (dataKey === 'CID' && selected.length > 0) {
		items.unshift({
			label: 'Selected: ' + selected.join(', '),
			isSelected: matchesSelected,
			onChange: () => setFilter(selected)
		})
	}

	return (
		<React.Fragment>
			<span>Filter:
			{dataKey === 'CID' &&
			<Button
				onClick={() => setFilter(selected)}
				disabled={selected.length === 0}
			>
				Selected
			</Button>}
			<Button
				onClick={clearAllItems}
				disabled={allClear}
			>
				Clear
			</Button></span>
			{dataKey === 'CID' && <StyledCommandIdFilter />}
			<SearchInput
				type="search"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Search..."
			/>
			<StyledList
				height={150}
				itemCount={items.length}
				itemSize={35}
				width='auto'
			>
				{({index, style}) => {
					const label = items[index].label
					const isSelected = items[index].isSelected
					const onChange = items[index].onChange
					return (
						<Item
							key={index}
							style={style}
							isSelected={isSelected}
						>
							<input type='checkbox' checked={isSelected} onChange={onChange}/>
							<span>{label}</span>
						</Item>
					)
				}}
			</StyledList>
		</React.Fragment>
	)
}

Filter.propTypes = {
	filter: PropTypes.object.isRequired,
	setFilter: PropTypes.func.isRequired,
	allOptions: PropTypes.array.isRequired,
	availableOptions: PropTypes.array.isRequired,
}

function Dropdown({style, className, dataKey, sort, setSort, filter, setFilter, addFilter, removeFilter, allOptions, availableOptions, close, dataSet, selected}) {
	const containerRef = React.useRef();
	const [containerStyle, setContainerStyle] = React.useState(style)

	// Close the dropdown if the user scrolls
	// (we don't track position changes during scrolling)
	React.useEffect(() => {
		window.addEventListener('scroll', close, true);
		return () => window.removeEventListener('scroll', close);
	}, [])

	React.useEffect(() => {
		// If the dropdown is outside the viewport, then move it
		const bounds = containerRef.current.getBoundingClientRect();
		if (bounds.x + bounds.width > window.innerWidth) {
			setContainerStyle(style => ({...style, left: window.innerWidth - bounds.width}))
		}
	})

	return (
		<DropdownContainer
			ref={containerRef}
			style={containerStyle}
			className={className}
		>
			{isSortable(sort, dataKey) &&
				<Sort
					dataKey={dataKey}
					sort={sort}
					setSort={setSort}
				/>
			}
			{filter &&
				<Filter
					dataKey={dataKey}
					selected={selected}
					sortType={sort.type[dataKey]}
					filter={filter}
					setFilter={setFilter}
					addFilter={addFilter}
					removeFilter={removeFilter}
					allOptions={allOptions}
					availableOptions={availableOptions}
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
			sort: state[dataSet].sort,
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
			setSort: (dataKey, direction) => dispatch(setSort(dataSet, dataKey, direction)),
		}
	}
)(Dropdown)

function renderDropdown({anchorRef, ...otherProps}) {
	return ReactDOM.createPortal(
		<ConnectedDropdown {...otherProps} />,
		anchorRef.current
	)
}

function ColumnDropdown(props) {
	const {className, style, label, ...otherProps} = props;
	const {anchorRef, column} = props;
	const containerRef = React.useRef();
	const [open, setOpen] = React.useState(false);
	const [position, setPosition] = React.useState({top: 0, left: 0});
	const width = 2*column.width;

	const handleClose = (e) => {
		// ignore if not open or event target is an element inside the dropdown
		if (!open || (anchorRef.current && anchorRef.current.lastChild.contains(e.target))) {
			return;
		}
		
		setOpen(false)
	}

	const handleOpen = () => {
		if (!open) {
			// Update position on open
			const anchor = anchorRef.current.getBoundingClientRect();
			const container = containerRef.current.getBoundingClientRect();
			const top = container.y - anchor.y + container.height;
			let left = container.x - anchor.x;
			if (left < anchor.x)
				left = 0;
			setPosition(position => (top !== position.top || left !== position.left)? {top, left}: position)
		}
		setOpen(!open)
	}

	const dropdownStyle = {...position, maxWidth: width};
	return (
		<Header
			ref={containerRef}
			onClickOutside={handleClose}
			className={className}
			style={style}
		>
			<label>{label}</label>
			<Handle className='handle' open={open} onClick={handleOpen} />
			{open && renderDropdown({style: dropdownStyle, close: handleClose, ...otherProps})}
		</Header>
	)
}

export default ColumnDropdown
