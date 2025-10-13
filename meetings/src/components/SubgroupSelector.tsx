import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectGroupEntities, selectActiveSubgroupIds } from "@/store/groups";

type Option = { value: string; label: string };

const selectSubgroupOptions = createSelector(
	selectActiveSubgroupIds,
	selectGroupEntities,
	(ids, entities): Option[] => {
		const workingGroupId = ids[0];
		return ids.map((id) => {
			const entity = entities[id]!;
			if (
				id == workingGroupId ||
				!entity.parent_id ||
				entity.parent_id === workingGroupId
			)
				return { value: id as string, label: entity.name };
			const parentEntity = entities[entity.parent_id];
			const label = `${
				parentEntity ? parentEntity.name + " / " : "(Missing) / "
			}${entity.name}`;
			return { value: id as string, label };
		});
	}
);

export function SubgroupSelector({
	value,
	onChange,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "readOnly"
	| "disabled"
	| "id"
	| "placeholder"
	| "className"
	| "style"
	| "isInvalid"
>) {
	const options = useAppSelector(selectSubgroupOptions);

	const handleChange = React.useCallback(
		(values: Option[]) => {
			onChange(values.length > 0 ? values[0].value : "");
		},
		[onChange]
	);

	const values = options.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			{...props}
		/>
	);
}
