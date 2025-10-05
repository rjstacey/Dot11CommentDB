import * as React from "react";
import { DropdownButton, DropdownItem } from "react-bootstrap";
import { Select, displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectSessionsState,
	selectSessions,
	Session,
	displaySessionType,
} from "@/store/sessions";

import styles from "./SessionSelector.module.css";

const renderSession = ({ item: session }: { item: Session }) => (
	<div className={styles.item}>
		<span>
			{session.number +
				" " +
				displaySessionType(session.type) +
				", " +
				displayDateRange(session.startDate, session.endDate)}
		</span>
		<span>{session.name}</span>
	</div>
);

function SessionSelector({
	value,
	onChange,
	style,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "id" | "style"
>) {
	const { loading, valid } = useAppSelector(selectSessionsState);
	const options = useAppSelector(selectSessions);

	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	return (
		<Select
			style={{ ...style, minWidth: 300, maxWidth: 400 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			placeholder="Select session..."
			searchable={false}
			clearable
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			//portal={document.querySelector("#root")}
			valueField="id"
			labelField="name"
			{...props}
		/>
	);
}

export function RawSessionSelector({
	onChange,
	...props
}: {
	onChange: (value: number) => void;
} & Pick<React.ComponentProps<typeof DropdownButton>, "id" | "disabled">) {
	const { ids, entities } = useAppSelector(selectSessionsState);
	const options = React.useMemo(
		() => ids.map((id) => entities[id]!),
		[entities, ids]
	);
	return (
		<DropdownButton variant="light" title="Import from..." {...props}>
			{options.map((item) => (
				<DropdownItem key={item.id} onClick={() => onChange(item.id)}>
					{renderSession({ item })}
				</DropdownItem>
			))}
		</DropdownButton>
	);
}

export default SessionSelector;
