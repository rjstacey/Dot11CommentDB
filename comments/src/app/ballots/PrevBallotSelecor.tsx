import React from "react";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { getBallotId, selectBallotsState } from "@/store/ballots";

function usePrevBallotOptions(ballot_id: number) {
	const { ids, entities } = useAppSelector(selectBallotsState);
	return React.useMemo(() => {
		const ballot = entities[ballot_id];
		if (!ballot) return [];
		return ids
			.map((id) => entities[id]!)
			.filter(
				(b) =>
					b.Type === ballot.Type &&
					b.groupId === ballot.groupId &&
					b.Project === ballot.Project &&
					new Date(b.Start || "") < new Date(ballot.Start || "") &&
					b.id !== ballot.id
			)
			.sort(
				(b1, b2) =>
					new Date(b1.Start || "").valueOf() -
					new Date(b2.Start || "").valueOf()
			)
			.map((b) => ({ id: b.id, label: getBallotId(b) }));
	}, [ballot_id, ids, entities]);
}

function SelectPrevBallot({
	value,
	onChange,
	ballot_id,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	ballot_id: number;
} & Pick<React.ComponentProps<typeof Select>, "placeholder" | "readOnly">) {
	const options = usePrevBallotOptions(ballot_id);
	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0].id : null);
	return (
		<Select
			values={values}
			options={options}
			onChange={handleChange}
			dropdownPosition="auto"
			valueField="id"
			{...otherProps}
		/>
	);
}

export default SelectPrevBallot;
