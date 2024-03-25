import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Select } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	getBallotId,
	setCurrentGroupProject,
	setCurrentBallot_id,
	selectBallotsState,
	selectGroupProjectOptions,
	selectBallotOptions,
	GroupProject,
} from "../store/ballots";

import styles from "./ProjectBallotSelector.module.css";

function ProjectSelect({
	value,
	onChange,
	loading,
	...props
}: {
	value: GroupProject;
	onChange: (value: GroupProject) => void;
	loading: boolean;
	readOnly?: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"options" | "values" | "onChange"
>) {
	const options = useAppSelector(selectGroupProjectOptions);
	const values = options.filter(
		(o) => value.groupId === o.groupId && value.project === o.project
	);
	const handleChange = (values: typeof options) =>
		onChange(
			values.length > 0 ? values[0] : { groupId: null, project: null }
		);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			{...props}
		/>
	);
}

function BallotSelect({
	value,
	onChange,
	loading,
	readOnly,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	loading: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"options" | "values" | "onChange"
>) {
	let ballots = useAppSelector(selectBallotOptions);
	const options = React.useMemo(
		() =>
			ballots.map((b) => ({
				value: b.id,
				label: `${getBallotId(b)} ${b.Document}`,
			})),
		[ballots]
	);
	const values = options.filter((o) => o.value === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].value : 0);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			readOnly={readOnly || options.length === 0}
			{...props}
		/>
	);
}

function BallotSelector({ readOnly }: { readOnly?: boolean }) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { ballotId } = useParams();
	const { loading, valid, currentGroupId, currentProject, currentBallot_id } =
		useAppSelector(selectBallotsState);

	const handleProjectChange = async (value: GroupProject) => {
		const ballot = await dispatch(setCurrentGroupProject(value));
		let pathName = location.pathname.replace(`/${ballotId}`, "");
		if (ballot) pathName = pathName + "/" + getBallotId(ballot);
		navigate(pathName);
	};

	const handleBallotChange = async (value: number | null) => {
		const ballot = await dispatch(setCurrentBallot_id(value));
		let pathName = location.pathname.replace(`/${ballotId}`, "");
		if (ballot) pathName = pathName + "/" + getBallotId(ballot);
		navigate(pathName);
	};

	return (
		<div className={styles.main}>
			<div className={styles.selector}>
				<label>Project:</label>
				<ProjectSelect
					style={{ minWidth: 150, marginRight: 20 }}
					value={{ groupId: currentGroupId, project: currentProject }}
					onChange={handleProjectChange}
					loading={loading && !valid}
					readOnly={readOnly}
				/>
			</div>
			<div className={styles.selector}>
				<label>Ballot:</label>
				<BallotSelect
					style={{ minWidth: 250 }}
					value={currentBallot_id}
					onChange={handleBallotChange}
					loading={loading && !valid}
					readOnly={readOnly}
				/>
			</div>
		</div>
	);
}

export default BallotSelector;
