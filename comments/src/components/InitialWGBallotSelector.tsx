import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Select } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	setCurrentBallot_id,
	selectBallotsState,
	selectBallots,
	BallotType,
} from "../store/ballots";

import styles from "./ProjectBallotSelector.module.css";

function InitialWGBallotSelector({
	readOnly,
}: {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
}) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { ballotId } = useParams();
	const { loading, valid, currentBallot_id } = useAppSelector(selectBallotsState);

	const ballots = useAppSelector(selectBallots);
	const options = React.useMemo(
		() =>
			ballots
				.filter((b) => b.Type === BallotType.WG && !b.IsRecirc)
				.map((b) => ({
					value: b.id,
					label: `${b.BallotID} ${b.Document}`,
				})),
		[ballots]
	);
	const values = options.filter((o) => o.value === currentBallot_id);

	async function handleChange(values: typeof options) {
		const value = values.length > 0 ? values[0].value : 0;
		const ballot = await dispatch(setCurrentBallot_id(value));
		let pathName = location.pathname.replace(`/${ballotId}`, "");
		if (ballot) pathName = pathName + `/${ballot.BallotID}`;
		navigate(pathName);
	}

	return (
		<div className={styles.main}>
			<label>Initial WG ballot:</label>
			<Select
				style={{ minWidth: 300 }}
				values={values}
				onChange={handleChange}
				options={options}
				loading={loading && !valid}
				readOnly={readOnly || options.length === 0}
			/>
		</div>
	);
}

export default InitialWGBallotSelector;
