import React from 'react';
import {useSelector} from 'react-redux';

import {Select} from 'dot11-components';

import {Group, selectGroupsState} from '../store/groups';
import {selectCurrentGroupId} from '../store/current';

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
	value: string[] | null;
	onChange: (value: string[] | null) => void;
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
	onChange: ((value: string | null) => void) | ((value: string[] | null) => void);
	multi?: boolean;
	types?: string[];
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "milti">) {
	const parentId = useSelector(selectCurrentGroupId);
	const {entities, ids} = useSelector(selectGroupsState);

	const groups = React.useMemo(() => {
		let groups = ids.map(id => entities[id]!);
		if (types)
			groups = groups.filter(group => types.includes(group.type || ''));
		if (parentId)
			groups = groups.filter(group => group.id === parentId || group.parent_id === parentId);
		return groups;
	}, [parentId, entities, ids, types]);

	const handleChange = React.useCallback((values: Group[]) => {
		let newValues: any;
		if (multi)
			newValues = values.map(group => group.id);
		else
			newValues = values.length > 0? values[0].id: '';
		onChange(newValues);
	}, [multi, onChange]);

	let values: (Group | Pick<Group, "id" | "name">)[];
	if (value) {
		if (multi)
			values = (value as string[]).map(id => entities[id] || {id, name: 'Unknown'});
		else
			values = [entities[value as string] || {id: value as string, name: 'Unknown'}];
	}
	else {
		values = [];
	}

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
