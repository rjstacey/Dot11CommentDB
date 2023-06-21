import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { Select, Icon } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentIds, selectCommentEntities, selectCommentsBallot_id } from '../store/comments';
import { selectBallotEntities } from '../store/ballots';
import { selectGroupIds, selectGroupEntities } from '../store/groups';

type AdHoc = {
	GroupId: string | null;
	Name: string | null;
}

const selectAdHocOptions = createSelector(
	selectCommentsBallot_id,
	selectBallotEntities,
	selectGroupIds,
	selectGroupEntities,
	selectCommentIds,
	selectCommentEntities,
	(ballot_id, ballotEntities, groupIds, groupEntities, commentIds, commentEntities) => {
		const adhocs: AdHoc[] = [];;
		const ballot = ballot_id? ballotEntities[ballot_id]: undefined;
		if (ballot?.groupId) {
			const group = groupEntities[ballot.groupId];
			if (group) {
				groupIds.forEach(id => {
					const g = groupEntities[id]!;
					if (g.parent_id === group.id && g.type === 'ah')
						adhocs.push({GroupId: g.id, Name: g.name});
				})
			}
		}
		(new Set(commentIds.filter(id => !commentEntities[id]!.AdHocGroupId && commentEntities[id]!.AdHoc).map(id => commentEntities[id]!.AdHoc)))
			.forEach(AdHoc => adhocs.push({GroupId: null, Name: AdHoc}));

		return adhocs;
	}
);

const itemRenderer = ({item}: {item: AdHoc}) => {
	return (
		<>
			<Icon name={item.GroupId? 'group': 'group-slash'} />
			<span style={{marginLeft: 10}}>{item.Name}</span>
		</>
	)
}

const nullAdHoc: AdHoc = {GroupId: null, Name: null};

function AdHocSelector({
	value,
	onChange,
	...otherProps
}: {
	value: AdHoc;
	onChange: (value: AdHoc) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const options = useAppSelector(selectAdHocOptions);
	const values = options.filter(o => value.GroupId? o.GroupId === value.GroupId: o.GroupId === null && o.Name === value.Name);
	const handleChange = (values: typeof options) => onChange(values.length? values[0]: nullAdHoc);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			create
			clearable
			selectItemRenderer={itemRenderer}
			itemRenderer={itemRenderer}
			labelField='Name'
			valueField='GroupId'
			{...otherProps}
		/>
	)
}

export default AdHocSelector;
