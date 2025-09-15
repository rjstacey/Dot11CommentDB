import * as React from "react";

import { Select, displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectImatMeetingsState, ImatMeeting } from "@/store/imatMeetings";

import styles from "./SessionSelector.module.css";

const renderItem = ({ item: session }: { item: ImatMeeting }) => (
	<div className={styles.item}>
		<span>
			{session.type + ", " + displayDateRange(session.start, session.end)}
		</span>
		<span>{session.name}</span>
	</div>
);

function ImatMeetingSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "id" | "placeholder" | "className" | "style"
>) {
	const { loading, valid, ids, entities } = useAppSelector(
		selectImatMeetingsState
	);
	const options = React.useMemo(
		() => ids.map((id) => entities[id]!),
		[entities, ids]
	);
	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : 0);

	return (
		<Select
			style={{ minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			clearable
			itemRenderer={renderItem}
			selectItemRenderer={renderItem}
			portal={document.querySelector("#root")}
			valueField="id"
			labelField="name"
			readOnly={readOnly}
			{...otherProps}
		/>
	);
}

export default ImatMeetingSelector;
