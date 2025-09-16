import * as React from "react";
import { Button, Dropdown } from "react-bootstrap";
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
	readOnly,
	style,
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
	style?: React.CSSProperties;
}) {
	const { loading, valid } = useAppSelector(selectSessionsState);
	const options = useAppSelector(selectSessions);

	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	return (
		<Select
			style={{ ...style, minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			searchable={false}
			clearable
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			readOnly={readOnly}
			portal={document.querySelector("#root")}
			valueField="id"
			labelField="name"
		/>
	);
}

export function RawSessionSelector2({
	onChange,
}: {
	onChange: (value: number) => void;
}) {
	const { loading, valid, ids, entities } =
		useAppSelector(selectSessionsState);
	const options = React.useMemo(
		() => ids.map((id) => entities[id]!),
		[entities, ids]
	);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : 0);
	return (
		<Select
			style={{ border: "none", padding: 0, width: "unset" }}
			options={options}
			values={[]}
			loading={loading && !valid}
			onChange={handleChange}
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			valueField="id"
			labelField="name"
			placeholder=""
			searchable={false}
			handle={false}
			dropdownWidth={300}
			dropdownAlign="right"
			contentRenderer={() => (
				<Button variant="light" className="bi-cloud-upload" />
			)}
		/>
	);
}

export function RawSessionSelector({
	onChange,
}: {
	onChange: (value: number) => void;
}) {
	const { ids, entities } = useAppSelector(selectSessionsState);
	const options = React.useMemo(
		() => ids.map((id) => entities[id]!),
		[entities, ids]
	);
	return (
		<Dropdown>
			<Dropdown.Toggle variant="light">Import from...</Dropdown.Toggle>
			<Dropdown.Menu className={styles.menu}>
				{options.map((item) => (
					<Dropdown.Item
						key={item.id}
						onClick={() => onChange(item.id)}
					>
						{renderSession({ item })}
					</Dropdown.Item>
				))}
			</Dropdown.Menu>
		</Dropdown>
	);
}

export default SessionSelector;
