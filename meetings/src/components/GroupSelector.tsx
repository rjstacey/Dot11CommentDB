import React from 'react';

import { Select } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { Group, selectGroups } from '../store/groups';

export function GroupSelector({
	value,
	onChange,
	multi,
	types,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	multi?: false;
	types?: string[];
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "milti">): JSX.Element;

export function GroupSelector({
	value,
	onChange,
	multi,
	types,
}: {
	value: string[];
	onChange: (value: string[]) => void;
	multi: true;
	types?: string[];
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "milti">): JSX.Element;

export function GroupSelector({
	value,
	onChange,
	types,
	multi,
	...otherProps
}: {
	value: string | string[] | null;
	onChange: ((value: string | null) => void) | ((value: string[]) => void);
	multi?: boolean;
	types?: string[];
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "milti">)
{

	let groups = useAppSelector(selectGroups);
	if (types)
		groups = groups.filter(group => types.includes(group.type!));

	const handleChange = React.useCallback((values: Group[]) => {
		let newValues: any;
		if (multi)
			newValues = values.map(group => group.id);
		else
			newValues = values.length > 0? values[0].id: '';
		onChange(newValues);
	}, [multi, onChange]);

	let values: Group[];
	if (multi)
		values = groups.filter(group => (value as string[]).includes(group.id));
	else
		values = groups.filter(group => group.id === (value as string));

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			multi={multi}
			clearable={!multi}
			valueField='id'
			labelField='name'
			{...otherProps}
		/>
	)
}

export default GroupSelector;
