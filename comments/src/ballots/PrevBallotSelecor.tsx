import * as React from "react";
import { Select } from "dot11-components";
import { useAppSelector } from "../store/hooks";
import { getBallotId, selectBallotsState } from "../store/ballots";

function usePrevBallotOptions(ballot_id: number) {
	const { ids, entities } = useAppSelector(selectBallotsState);
	return React.useMemo(() => {
		const ballot = entities[ballot_id];
		if (!ballot) return [];
		return ids
			.map((id) => entities[id]!)
			.filter(
				(b) =>
					b.groupId === ballot.groupId &&
					b.Project === ballot.Project &&
					new Date(b.Start || "") < new Date(ballot.Start || "")
			)
			.map((b) => ({id: b.id, label: getBallotId(b)}));
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
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
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
