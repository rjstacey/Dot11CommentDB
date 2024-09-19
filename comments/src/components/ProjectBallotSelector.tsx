import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Select } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	getBallotId,
	setCurrentGroupProject,
	setCurrentBallot_id,
	selectBallotsState,
	selectGroupProjectOptions,
	selectBallotOptions,
	selectBallotByBallotID,
	GroupProject,
	selectCurrentGroupProject,
	BallotType,
	getStage,
} from "../store/ballots";

import styles from "./ProjectBallotSelector.module.css";
import { selectIsOnline } from "../store/offline";

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
				label:
					(b.Type === BallotType.SA
						? `SA ${getStage(b)}`
						: getBallotId(b)) +
					" on " +
					b.Document,
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
	const dispatch = useAppDispatch();

	const isOnline = useAppSelector(selectIsOnline);
	if (!isOnline) readOnly = true;

	const { ballotId } = useParams();
	const ballot = useAppSelector((state) =>
		ballotId ? selectBallotByBallotID(state, ballotId) : undefined
	);
	const ballot_id = ballot?.id || null;
	let groupProject = useAppSelector(selectCurrentGroupProject);
	if (
		ballot &&
		(groupProject.groupId !== ballot.groupId ||
			groupProject.project !== ballot.Project)
	)
		groupProject = { groupId: ballot.groupId, project: ballot.Project };

	const { loading, valid } = useAppSelector(selectBallotsState);

	const handleProjectChange = async (groupProject: GroupProject) => {
		const ballot = await dispatch(setCurrentGroupProject(groupProject));
		const ballotId = ballot ? getBallotId(ballot) : undefined;
		navigate(ballotId || "");
	};

	const handleBallotChange = async (value: number | null) => {
		const ballot = await dispatch(setCurrentBallot_id(value));
		const ballotId = ballot ? getBallotId(ballot) : undefined;
		navigate(ballotId || "");
	};

	return (
		<div className={styles.main}>
			<div className={styles.selector}>
				<label>Project:</label>
				<ProjectSelect
					style={{ minWidth: 150, width: 250, marginRight: 20 }}
					value={groupProject}
					onChange={handleProjectChange}
					loading={loading && !valid}
					readOnly={readOnly}
				/>
			</div>
			<div className={styles.selector}>
				<label>Ballot:</label>
				<BallotSelect
					style={{ minWidth: 250, width: 300 }}
					value={ballot_id}
					onChange={handleBallotChange}
					loading={loading && !valid}
					readOnly={readOnly}
				/>
			</div>
		</div>
	);
}

export default BallotSelector;
