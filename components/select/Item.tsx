import * as React from "react";
import type {
	ItemType,
	SelectInternalProps,
	SelectState,
	SelectMethods,
} from "./index";

function Item<T extends ItemType>({
	style,
	className,
	index,
	item,
	props,
	state,
	methods,
}: {
	style?: React.CSSProperties;
	className?: string;
	index: number;
	item: T;
	props: SelectInternalProps<T>;
	state: SelectState<T>;
	methods: SelectMethods<T>;
}) {
	const isSelected = methods.isSelected(item);
	const isDisabled = methods.isDisabled(item);
	const isActive = state.cursor === index;
	const isNew = props.create && state.search && index === 0;

	let cn = "item";
	if (isNew) cn += " new";
	if (isActive) cn += " active";
	if (isSelected) cn += " selected";
	if (isDisabled) cn += " disabled";
	if (className) cn += " " + className;

	const addItem = isDisabled
		? undefined
		: isNew
		? () => methods.addSearchItem()
		: () => methods.addItem(item);

	const label = item[props.labelField];

	return (
		<div
			style={style}
			className={className}
			role="option"
			aria-selected={isSelected}
			aria-disabled={isDisabled}
			aria-label={label}
			onClick={addItem}
		>
			{isNew ? `Add "${label}"` : label}
		</div>
	);
}

export default Item;
