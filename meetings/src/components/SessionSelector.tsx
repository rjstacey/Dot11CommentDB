import * as React from "react";
import { Dropdown, DropdownItem } from "react-bootstrap";
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
	"readOnly" | "disabled" | "id" | "style" | "isInvalid"
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
			valueField="id"
			labelField="name"
			{...props}
		/>
	);
}

export function RawSessionSelector({
	onChange,
	disabled,
	...props
}: {
	onChange: (value: number) => void;
	disabled?: boolean;
} & Pick<React.ComponentProps<typeof Dropdown>, "id">) {
	const { ids, entities } = useAppSelector(selectSessionsState);
	const options = React.useMemo(
		() => ids.map((id) => entities[id]!),
		[entities, ids]
	);
	return (
		<Dropdown {...props}>
			<Dropdown.Toggle variant="light" disabled={disabled}>
				{"Import from..."}
			</Dropdown.Toggle>
			<Dropdown.Menu
				style={{ maxWidth: 300, maxHeight: 300, overflow: "auto" }}
			>
				{options.map((item) => (
					<DropdownItem
						key={item.id}
						onClick={() => onChange(item.id)}
					>
						{renderSession({ item })}
					</DropdownItem>
				))}
			</Dropdown.Menu>
		</Dropdown>
	);
}

export default SessionSelector;
