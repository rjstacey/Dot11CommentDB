import React from "react";
import { useAppSelector } from "../store/hooks";

import { Select } from "dot11-components";

import {
	selectSessionRegistrationState,
	selectSessionRegistrationsUnmatched,
	SessionRegistration,
} from "../store/sessionRegistration";

import styles from "./sessionAttendance.module.css";

const renderRegistration = ({ item: reg }: { item: SessionRegistration }) => (
	<div className={styles.sessionItem} key={reg.Email}>
		<span>{reg.SAPIN + " " + reg.Name + " (" + reg.Email + ") "}</span>
	</div>
);

function RegistrationSelector({
	value,
	onChange,
	readOnly,
	style,
}: {
	value: number | null;
	onChange: (value: SessionRegistration | null) => void;
	readOnly?: boolean;
	style?: React.CSSProperties;
}) {
	const { loading, valid } = useAppSelector(selectSessionRegistrationState);
	const options = useAppSelector(selectSessionRegistrationsUnmatched);
	const values = options.filter((o) => o.SAPIN === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0] : null);

	return (
		<Select
			style={{ ...style, minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			clearable
			itemRenderer={renderRegistration}
			selectItemRenderer={renderRegistration}
			readOnly={readOnly}
			portal={document.querySelector("#root")}
			labelField="Name"
		/>
	);
}

export default RegistrationSelector;
