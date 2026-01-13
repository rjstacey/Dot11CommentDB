import React from "react";
import { FormCheck } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router";

import { Select } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	getEncodedBallotId,
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
	selectChooseFromActiveGroups,
	setChooseFromActiveGroups,
} from "@/store/ballots";
import { selectIsOnline } from "@/store/offline";

import styles from "./ProjectBallotSelector.module.css";

function ActiveGroupsCheck() {
	const dispatch = useAppDispatch();
	const activeOnly = useAppSelector(selectChooseFromActiveGroups);
	const toggleActiveOnly = () =>
		dispatch(setChooseFromActiveGroups(!activeOnly));
	return (
		<div onClick={(e) => e.stopPropagation()} className="p-2">
			<FormCheck
				checked={activeOnly}
				onChange={toggleActiveOnly}
				label="Active groups"
			/>
		</div>
	);
}

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
	style?: React.CSSProperties;
	id?: string;
}) {
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
			extraRenderer={() => <ActiveGroupsCheck />}
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
	readOnly?: boolean;
	style?: React.CSSProperties;
	id?: string;
}) {
	const ballots = useAppSelector(selectBallotOptions);
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
	const location = useLocation();
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
		const ballotId = ballot ? getEncodedBallotId(ballot) : "";
		const search = new URLSearchParams(location.search);
		search.delete("cid");
		navigate({ pathname: ballotId, search: search.toString() });
	};

	const handleBallotChange = async (value: number | null) => {
		const ballot = await dispatch(setCurrentBallot_id(value));
		const ballotId = ballot ? getEncodedBallotId(ballot) : "";
		const search = new URLSearchParams(location.search);
		search.delete("cid");
		navigate({ pathname: ballotId, search: search.toString() });
	};

	return (
		<div className={styles.main}>
			<div className={styles.selector}>
				<label htmlFor="project-select">Project:</label>
				<ProjectSelect
					id="project-select"
					style={{ minWidth: 200 }}
					value={groupProject}
					onChange={handleProjectChange}
					loading={loading && !valid}
					readOnly={readOnly}
				/>
			</div>
			<div className={styles.selector}>
				<label htmlFor="ballot-select">Ballot:</label>
				<BallotSelect
					id="ballot-select"
					style={{ minWidth: 200 }}
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
