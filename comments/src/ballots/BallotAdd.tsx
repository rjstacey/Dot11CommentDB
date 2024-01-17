import * as React from "react";
import { Form, ActionButtonDropdown } from "dot11-components";

import EditBallot from "./BallotEdit";

import { useAppDispatch } from "../store/hooks";
import {
	addBallot,
	setCurrentGroupProject,
	setSelectedBallots,
	Ballot,
	BallotEdit,
} from "../store/ballots";

function getDefaultBallot(): BallotEdit {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return {
		groupId: null,
		Project: "",
		BallotID: "",
		EpollNum: 0,
		Document: "",
		Topic: "",
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: "",
		prev_id: 0,
		Type: 0,
		IsRecirc: false,
		IsComplete: false,
	};
}

export function BallotAddForm({
	defaultBallot,
	methods,
}: {
	defaultBallot?: BallotEdit;
	methods: { close: () => void };
}) {
	const dispatch = useAppDispatch();
	const [ballot, setBallot] = React.useState<BallotEdit>(
		defaultBallot || getDefaultBallot()
	);
	const [busy, setBusy] = React.useState(false);

	let errorMsg = "";
	if (!ballot.groupId) errorMsg = "Group not set";
	else if (!ballot.Project) errorMsg = "Project not set";
	else if (!ballot.BallotID) errorMsg = "Ballot ID not set";

	const submit = async () => {
		if (!errorMsg) {
			setBusy(true);
			const b = await dispatch(addBallot(ballot));
			if (b) {
				dispatch(
					setCurrentGroupProject({
						groupId: ballot.groupId,
						project: ballot.Project,
					})
				);
				dispatch(setSelectedBallots([b.id]));
			}
			setBusy(false);
			methods.close();
		}
	};

	const updateBallot = (changes: Partial<BallotEdit>) =>
		setBallot((ballot) => ({ ...ballot, ...changes }));

	const editBallot: Ballot = {
		...ballot,
		id: 0,
		Voters: 0,
		Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
		Results: null,
	};

	return (
		<Form
			style={{ width: "700px" }}
			title="Add ballot"
			submit={submit}
			submitLabel="Add"
			cancel={methods.close}
			errorText={errorMsg}
			busy={busy}
		>
			<EditBallot
				ballot={editBallot}
				updateBallot={updateBallot}
				readOnly={false}
			/>
		</Form>
	);
}


export const BallotAddButton = () => (
	<ActionButtonDropdown
		name="add"
		title="Add ballot"
		dropdownRenderer={(props) => <BallotAddForm {...props} />}
	/>
);

export default BallotAddForm;
