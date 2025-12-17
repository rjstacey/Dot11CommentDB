import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";

import { Select, SelectRendererProps } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectCommentIds,
	selectCommentEntities,
	selectCommentsBallot_id,
} from "@/store/comments";
import { selectBallotEntities } from "@/store/ballots";
import { selectGroupIds, selectGroupEntities } from "@/store/groups";

type AdHoc = {
	GroupId: string | null;
	Name: string;
};

const selectAdHocOptions = createSelector(
	selectCommentsBallot_id,
	selectBallotEntities,
	selectGroupIds,
	selectGroupEntities,
	selectCommentIds,
	selectCommentEntities,
	(
		ballot_id,
		ballotEntities,
		groupIds,
		groupEntities,
		commentIds,
		commentEntities
	) => {
		const adhocs: AdHoc[] = [];
		new Set(
			commentIds
				.map((id) => commentEntities[id]!)
				.filter((c) => !c.AdHocGroupId && c.AdHoc)
				.map((c) => c.AdHoc)
		).forEach((AdHoc) => adhocs.push({ GroupId: null, Name: AdHoc }));

		const ballot = ballot_id ? ballotEntities[ballot_id] : undefined;
		if (ballot?.groupId) {
			const group = groupEntities[ballot.groupId];
			if (group) {
				groupIds.forEach((id) => {
					const g = groupEntities[id]!;
					if (g.parent_id === group.id && g.type === "ah")
						adhocs.push({ GroupId: g.id, Name: g.name });
				});
			}
		}
		return adhocs;
	}
);

const itemRenderer = ({ item }: { item: AdHoc }) => {
	return (
		<>
			<i className={item.GroupId ? "bi-house" : "bi-house-slash"} />
			<span style={{ marginLeft: 10 }}>{item.Name}</span>
		</>
	);
};

const nullAdHoc: AdHoc = { GroupId: null, Name: "" };

export function AdHocSelect({
	value,
	onChange,
	...props
}: {
	value: AdHoc;
	onChange: (value: AdHoc) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"placeholder" | "readOnly" | "disabled" | "style" | "id"
>) {
	const existingOptions = useAppSelector(selectAdHocOptions);
	const [options, setOptions] = React.useState(existingOptions);

	async function createOption({ state }: SelectRendererProps<AdHoc>) {
		const option = {
			GroupId: null,
			Name: state.search,
		};
		setOptions(existingOptions.concat(option));
		return option;
	}

	let values: AdHoc[];
	if (value.GroupId) {
		values = options.filter((o) => o.GroupId === value.GroupId);
	} else if (value.Name) {
		values = options.filter(
			(o) => o.GroupId === null && o.Name === value.Name
		);
	} else {
		values = [];
	}

	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0] : nullAdHoc);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			create
			createOption={createOption}
			selectItemRenderer={itemRenderer}
			itemRenderer={itemRenderer}
			labelField="Name"
			valueField="GroupId"
			{...props}
		/>
	);
}
