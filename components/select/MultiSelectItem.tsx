import React from "react";
import type { SelectItemRendererProps } from ".";

const Clear = (props: React.ComponentProps<"div">) => (
	<div className="multi-item-clear" {...props} />
);

const MultiSelectItem = ({
	item,
	props,
	state,
	methods,
}: SelectItemRendererProps) => {
	const remove = (event: React.MouseEvent) => {
		event.stopPropagation();
		methods.removeItem(item);
	};

	return (
		<div
			role="listitem"
			//direction={props.direction}
			className="multi-item"
			key={"" + item[props.valueField] + item[props.labelField]}
		>
			<span className="dropdown-select-multi-item-label">
				{item[props.labelField]}
			</span>
			{!props.readOnly && <Clear onClick={remove} />}
		</div>
	);
};

export default MultiSelectItem;
