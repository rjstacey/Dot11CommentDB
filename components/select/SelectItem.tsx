import type { SelectItemRendererProps } from ".";

const SelectItem = ({ item, props }: SelectItemRendererProps) => (
	<span className="single-item">
		{item[props.labelField]}
	</span>
);

export default SelectItem;
