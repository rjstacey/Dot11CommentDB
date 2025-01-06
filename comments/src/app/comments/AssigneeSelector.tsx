import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";

import { Select, SelectRendererProps, strComp } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import {
	selectMemberEntities,
	selectMemberIds,
	selectMembersState,
} from "@/store/members";
import { selectCommentIds, selectCommentEntities } from "@/store/comments";

type Assignee = {
	SAPIN: number;
	Name: string;
};

const selectAssigneeOptions = createSelector(
	selectCommentIds,
	selectCommentEntities,
	selectMemberIds,
	selectMemberEntities,
	(commentIds, commentEntities, userIds, userEntities) => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const presentOptions: Assignee[] = commentIds
			.reduce((arr, id) => {
				const c = commentEntities[id]!;
				if (!c.AssigneeSAPIN && !c.AssigneeName) return arr;
				if (
					c.AssigneeSAPIN &&
					arr.find((o) => o.SAPIN === c.AssigneeSAPIN)
				)
					return arr;
				if (arr.find((o) => o.Name === c.AssigneeName)) return arr;
				return [
					...arr,
					{ SAPIN: c.AssigneeSAPIN || 0, Name: c.AssigneeName || "" },
				];
			}, [] as Assignee[])
			.sort((a, b) => strComp(a.Name, b.Name));

		const userOptions = userIds
			.filter((sapin) => !presentOptions.find((o) => o.SAPIN === sapin))
			.map((sapin) => ({
				SAPIN: sapin as number,
				Name: userEntities[sapin]!.Name,
			}))
			.sort((a, b) => strComp(a.Name, b.Name));

		return presentOptions.concat(userOptions);
	}
);

const itemRenderer = ({ item }: { item: Assignee }) => {
	return (
		<>
			<i className={item.SAPIN ? "bi-person" : "bi-person-slash"} />
			<span style={{ marginLeft: 10 }}>{item.Name}</span>
		</>
	);
};

const nullAssignee: Assignee = { SAPIN: 0, Name: "" };

function AssigneeSelector({
	value, // value is object with shape {SAPIN: number, Name: string}
	onChange,
	readOnly,
	...otherProps
}: {
	value: Assignee;
	onChange: (value: Assignee) => void;
	readOnly?: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const { loading } = useAppSelector(selectMembersState);
	const existingOptions = useAppSelector(selectAssigneeOptions);
	const [options, setOptions] = React.useState(existingOptions);

	function createOption({ state }: SelectRendererProps) {
		const value = { SAPIN: 0, Name: state.search };
		setOptions((options: typeof existingOptions) => {
			if (
				options.find(
					(o: Assignee) =>
						o.SAPIN === value.SAPIN && o.Name === value.Name
				)
			)
				return options;
			return [value, ...options];
		});
		return value;
	}

	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0] : nullAssignee);

	const values = value.SAPIN
		? options.filter((o) => o.SAPIN === value.SAPIN)
		: options.filter((o) => o.SAPIN === 0 && o.Name === value.Name);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			create
			createOption={createOption}
			selectItemRenderer={itemRenderer}
			itemRenderer={itemRenderer}
			readOnly={readOnly}
			valueField="SAPIN"
			labelField="Name"
			{...otherProps}
		/>
	);
}

export default AssigneeSelector;
