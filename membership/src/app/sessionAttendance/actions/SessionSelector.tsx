import React from "react";
import { useAppSelector } from "@/store/hooks";

import { Select, displayDateRange } from "dot11-components";

import {
	selectSessionsState,
	selectRecentSessions,
	Session,
	displaySessionType,
} from "@/store/sessions";

import styles from "./actions.module.css";

const renderSession = ({ item: session }: { item: Session }) => (
	<div className={styles.sessionItem}>
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

export function SessionSelector({
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
	const options = useAppSelector(selectRecentSessions);
	const values = options.filter((o) => o.number === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].number : null);

	return (
		<Select
			style={{ ...style, minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
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
