import React from "react";
import { useAppSelector } from "../store/hooks";

import { Select, displayDateRange } from "dot11-components";

import { selectRecentSessions, Session } from "../store/sessions";

import styles from "./sessionAttendance.module.css";

const renderSession = ({ item: session }: { item: Session }) => (
	<div className={styles.sessionItem}>
		<span>{session.name}</span>
		<span>{displayDateRange(session.startDate, session.endDate)}</span>
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
	const options = useAppSelector(selectRecentSessions);
	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	return (
		<Select
			style={{ ...style, minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
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

export default SessionSelector;
