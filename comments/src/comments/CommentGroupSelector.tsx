import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { Select } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentIds, selectCommentEntities, getField } from '../store/comments';

const field = 'CommentGroup';
const selectFieldValues = createSelector(
	selectCommentIds,
	selectCommentEntities,
	(ids, entities) => {
		return [...new Set(ids.map(id => getField(entities[id]!, field)))]
			.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
			.map(v => ({label: v, value: v}))
	}
);

function CommentGroupSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const options = useAppSelector(selectFieldValues);
	const values = options.filter(o => o.value === value);
	const handleChange = (values: typeof options) => onChange(values.length? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			create
			clearable
			{...otherProps}
		/>
	)
}

export default CommentGroupSelector;
