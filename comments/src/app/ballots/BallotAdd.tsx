import React from "react";
import { Form } from "dot11-components";

import { EditBallot } from "./BallotEdit";

import { useAppDispatch } from "@/store/hooks";
import {
	addBallot,
	setSelectedBallots,
	setCurrentGroupProject,
	Ballot,
} from "@/store/ballots";

export function BallotAddForm({
	defaultBallot,
	close,
}: {
	defaultBallot: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [ballot, setBallot] = React.useState(defaultBallot);

	let errorMsg = "";
	if (!ballot.groupId) errorMsg = "Group not set";
	else if (ballot.Type === null) errorMsg = "Ballot type not set";
	else if (!ballot.number) errorMsg = "Ballot number not set";
	else if (!ballot.Project) errorMsg = "Project not set";

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
			close();
		}
	};

	return (
		<Form
			submit={submit}
			submitLabel="Add"
			cancel={close}
			errorText={errorMsg}
			busy={busy}
		>
			<EditBallot
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
		</Form>
	);
}

export default BallotAddForm;
