import type { ItemType } from ".";

const SelectItem = ({
	item,
	props,
}: {
	item: ItemType;
	props: { labelField: keyof ItemType };
}) => <span className="single-item">{item[props.labelField]}</span>;

export default SelectItem;
