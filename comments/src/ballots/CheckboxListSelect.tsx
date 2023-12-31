import React from "react";
import {
	List,
	ListItem,
	Checkbox,
	isMultiple,
	MULTIPLE,
} from "dot11-components";

const CheckboxListSelect = ({
	value,
	onChange,
	label,
	options,
	readOnly,
}: {
	value: number | typeof MULTIPLE;
	onChange: (value: number) => void;
	label: string;
	options: { value: number; label: string }[];
	readOnly?: boolean;
}) => (
	<List label={label}>
		{options.map((o) => (
			<ListItem key={o.value}>
				<Checkbox
					id={"_" + o.value}
					value={o.value}
					checked={value === o.value}
					indeterminate={isMultiple(value)}
					onChange={(e) => onChange(parseInt(e.target.value, 10))}
					disabled={readOnly}
				/>
				<label htmlFor={"_" + o.value}>{o.label}</label>
			</ListItem>
		))}
	</List>
);

export default React.memo(CheckboxListSelect);
