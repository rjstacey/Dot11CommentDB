import { useRef, useState, useEffect, useCallback } from "react";
import { List, useListRef, type RowComponentProps } from "react-window";
import type { SelectRendererProps, ItemType } from ".";

/* ItemWrapper measures and sets the height of the item */
function ItemWrapper<T extends ItemType>({
	index,
	style,
	options,
	setRowHeight,
	props,
	state,
	methods,
}: RowComponentProps<
	{
		options: T[];
		setRowHeight: (index: number, height: number) => void;
	} & SelectRendererProps<T>
>) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) {
			const bounds = ref.current.getBoundingClientRect();
			if (style.height !== bounds.height)
				setRowHeight(index, bounds.height);
		}
	}, []);

	const item = options[index];
	const isSelected = methods.isSelected(item);
	const isDisabled = methods.isDisabled(item);
	const isActive = state.cursor === index;
	const isNew = props.create && state.search && index === 0;

	let className = "item";
	if (isNew) className += " new";
	if (isActive) className += " active";
	if (isSelected) className += " selected";
	if (isDisabled) className += " disabled";

	const addItem = isNew
		? () => methods.addSearchItem()
		: () => methods.addItem(item);

	return (
		<div style={style}>
			<div
				ref={ref}
				className={className}
				onClick={isDisabled ? undefined : addItem}
				role="option"
				aria-selected={isSelected}
				aria-disabled={isDisabled}
				aria-label={item[props.labelField]}
			>
				{isNew
					? props.addItemRenderer({
							item,
							props,
							state,
							methods,
						})
					: props.itemRenderer({
							item,
							props,
							state,
							methods,
						})}
			</div>
		</div>
	);
}

function Dropdown<T extends ItemType>({
	props,
	state,
	methods,
}: SelectRendererProps<T>) {
	const listRef = useListRef(null);
	const [heights, setHeights] = useState<number[]>([]);

	const setRowHeight = useCallback(
		(index: number, height: number) =>
			setHeights((heights) => {
				if (heights[index] !== height) {
					const newHeights = heights.slice();
					newHeights[index] = height;
					return newHeights;
				}
				return heights;
			}),
		[setHeights],
	);

	const getRowHeight = useCallback(
		(index: number) => heights[index] || props.estimatedItemHeight,
		[props.estimatedItemHeight, heights],
	);

	const options = methods.searchResults();

	useEffect(() => {
		if (state.cursor !== null) {
			listRef.current?.scrollToRow({ index: state.cursor });
		}
	}, [state.cursor]);

	const style = props.dropdownHeight
		? { maxHeight: props.dropdownHeight }
		: undefined;

	return (
		<>
			{props.extraRenderer({ props, state, methods })}
			{options.length === 0 ? (
				props.noDataRenderer({ props, state, methods })
			) : (
				<List
					listRef={listRef}
					rowComponent={ItemWrapper}
					rowProps={{
						options,
						setRowHeight,
						props,
						state,
						methods,
					}}
					rowCount={options.length}
					rowHeight={getRowHeight}
					onMouseDown={(e) => e.preventDefault()} // prevent input element losing focus
					style={style}
				/>
			)}
		</>
	);
}

export default Dropdown;
