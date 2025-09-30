import * as React from "react";
import { VariableSizeList as List } from "react-window";
import type { SelectRendererProps, ItemType } from ".";

/* ItemWrapper measures and sets the height of the item */
function ItemWrapper<T extends ItemType>({
	style,
	item,
	index,
	setHeight,
	props,
	state,
	methods,
}: {
	style: React.CSSProperties;
	item: any;
	index: number;
	setHeight: (height: number) => void;
} & SelectRendererProps<T>) {
	const ref = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		if (ref.current) {
			const bounds = ref.current.getBoundingClientRect();
			if (style.height !== bounds.height) setHeight(bounds.height);
		}
	});

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
	const listRef = React.useRef<List>(null);
	const listInnerRef = React.useRef<HTMLDivElement>(null);
	const heightsRef = React.useRef<number[]>([]);

	const setItemHeight = (index: number, height: number) => {
		const heights = heightsRef.current;
		heights[index] = height;
		listRef.current?.resetAfterIndex(index, true);
	};

	const getItemHeight = (index: number) =>
		heightsRef.current[index] || props.estimatedItemHeight;

	const options = methods.searchResults();

	React.useEffect(() => {
		if (state.cursor) {
			listRef.current?.scrollToItem(state.cursor);
		}
	}, [state.cursor]);

	const [maxHeight, setMaxHeight] = React.useState(props.dropdownHeight);

	React.useLayoutEffect(() => {
		if (!listInnerRef.current) return;
		const bounds = listInnerRef.current.getBoundingClientRect();
		const height =
			bounds.height < props.dropdownHeight
				? bounds.height
				: props.dropdownHeight;
		if (height !== maxHeight) {
			setMaxHeight(height);
		}
	}, [props.dropdownHeight, maxHeight, options]);

	const itemKey = (index: number) => {
		if (props.create && state.search && index === 0) return "{new-item}";
		return (
			"" +
			options[index][props.valueField] +
			options[index][props.labelField]
		);
	};

	// To prevent input element losing focus, block mousedown event
	const innerEl = (props: React.HTMLAttributes<HTMLDivElement>) => (
		<div
			ref={listInnerRef}
			onMouseDown={(e) => e.preventDefault()}
			{...props}
		/>
	);

	const list =
		options.length === 0 ? (
			props.noDataRenderer({ props, state, methods })
		) : (
			<List
				ref={listRef}
				height={maxHeight}
				width="auto"
				itemCount={options.length}
				itemSize={getItemHeight}
				estimatedItemSize={props.estimatedItemHeight}
				itemKey={itemKey}
				innerElementType={innerEl}
			>
				{({ index, style }) => (
					<ItemWrapper
						index={index}
						style={style}
						item={options[index]}
						setHeight={(height: number) =>
							setItemHeight(index, height)
						}
						props={props}
						methods={methods}
						state={state}
					/>
				)}
			</List>
		);

	return (
		<>
			{props.extraRenderer({ props, state, methods })}
			{list}
		</>
	);
}

export default Dropdown;
