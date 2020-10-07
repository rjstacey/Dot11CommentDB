import React from 'react'
import ReactDOM from 'react-dom'
import styled from '@emotion/styled'
import {SortType, SortDirection, isSortable} from '../reducers/sort'
import {ActionButtonSort, Button, Handle} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'

const SearchInput = styled.input`
	margin: 10px 10px 0;
	line-height: 30px;
	padding: 0px 20px;
	border: 1px solid #ccc;
	border-radius: 3px;
	:focus {
		outline: none;
		border: 1px solid deepskyblue;
	}
`;

const Items = styled.div`
	overflow-x: auto;
	min-height: 10px;
	max-height: 200px;
	border: 1px solid #ccc;
	border-radius: 3px;
	margin: 10px;
	padding: 10px;
	display: flex;
	flex-direction: column;
`;

const Item = styled.div`
	display: flex;
	align-items: baseline;
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


function Dropdown({ style, className, dataKey, sort, setSort, filter, setFilter, allOptions, availableOptions, close }) {
	const [search, setSearch] = React.useState('')
	const regexp = new RegExp(search, 'i');

	const isSelected = (item) => Array.isArray(filter.values) && filter.values.find(v => v === item.value)

	const allClear = (Array.isArray(filter.values) && filter.values.length === 0) || !filter.values;

	const clearAllItems = () => setFilter([]);

	const addSearch = () => setFilter(search);

	const addItem = (item) => {
		if (Array.isArray(filter.values)) {
			const values = filter.values.slice();
			const i = values.findIndex(v => v === item.value);
			if (i >= 0)
				values.splice(i, 1)
			else
				values.push(item.value)
			setFilter(values)
		}
		else {
			setFilter([item.value])
		}
	}

	const options = (Array.isArray(filter.values) && filter.values.length > 0)? allOptions: availableOptions;

	return (
		<DropdownContainer
			style={style}
			className={className}
		>
			{isSortable(sort, dataKey) &&
				<span>Sort:
					<span>
						<ActionButtonSort
							onClick={e => setSort(dataKey, SortDirection.ASC)}
							direction={SortDirection.ASC}
							isAlpha={sort.type[dataKey] !== SortType.NUMERIC}
							isActive={sort.direction[dataKey] === SortDirection.ASC}
						/>
						<ActionButtonSort
							onClick={e => setSort(dataKey, SortDirection.DESC)}
							direction={SortDirection.DESC}
							isAlpha={sort.type[dataKey] !== SortType.NUMERIC}
							isActive={sort.direction[dataKey] === SortDirection.DESC}
						/>
						<Button
							onClick={e => setSort(dataKey, SortDirection.NONE)}
							isActive={sort.direction[dataKey] === SortDirection.NONE}
						>
							clear
						</Button>
					</span>
				</span>
			}

			{filter &&
				<React.Fragment>
					<span>Filter:</span>
					<SearchInput
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search..."
					/>
					<Items>
						<Item
							key='clear-all'
							isSelected={allClear}
							onClick={clearAllItems}
						>
							<input type='checkbox' checked={allClear}/>
							<span>(Clear All)</span>
						</Item>
						{search &&
							<Item
								key='add-search'
								isSelected={false}
								onClick={addSearch}
							>
								<input type='checkbox' checked={false}/>
								<span>{'Add: ' + search}</span>
							</Item>
						}
						{options
							.filter((item) => regexp.test(item.label))
							.map((item) => {
								const isSel = isSelected(item)
								return (
									<Item
										key={item.value}
										disabled={item.disabled}
										isSelected={isSel}
										onClick={item.disabled ? null : () => addItem(item)}
									>
										<input type='checkbox' checked={isSel} onChange={() => console.log('add')} />
										<span>{item.label}</span>
									</Item>
								);
						})}
					</Items>
				</React.Fragment>
			}
		</DropdownContainer>
	);
};

function renderDropdown({anchorRef, ...otherProps}) {
	return ReactDOM.createPortal(
		<Dropdown {...otherProps} />,
		anchorRef.current
	)
}

function ColumnDropdown({
	className,
	style,
	label,
	...props
}) {
	const {anchorRef} = props;
	const containerRef = React.createRef();
	const [open, setOpen] = React.useState(false);
	const [bounds, setBounds] = React.useState({});

	React.useEffect(() => {
		// Get container bounds relative to anchor
		const anchor = anchorRef.current.getBoundingClientRect()
		const container = containerRef.current.getBoundingClientRect()
		const relative = {
			x: container.x - anchor.x,
			y: container.y - anchor.y,
			height: container.height,
			width: container.width
		}
		setBounds(relative)
	}, [props.column])

	const handleClose = (e) => {
		if (!open || anchorRef.current.contains(e.target)) {
			// ignore if not open or event target is an element inside the dropdown
			return;
		}
		setOpen(false)
	}

	const dropdownStyle = {top: bounds.y + bounds.height+2, left: bounds.x, maxWidth: 2*props.column.width};

	return (
		<Header
			ref={containerRef}
			onClickOutside={handleClose}
			className={className}
			style={style}
		>
			<label>{label}</label>
			<Handle className='handle' open={open} onClick={() => setOpen(!open)} />
			{open && renderDropdown({bounds, style: dropdownStyle, close: handleClose, ...props})}
		</Header>
	)
}

export default ColumnDropdown