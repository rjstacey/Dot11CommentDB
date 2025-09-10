import React from "react";
import { Form } from "react-bootstrap";
import {
	Multiple,
	shallowDiff,
	deepMergeTagMultiple,
	useDebounce,
} from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	updateBallots,
	setCurrentGroupProject,
	Ballot,
	BallotChange,
	BallotUpdate,
	BallotType,
} from "@/store/ballots";

import { BallotEdit } from "./BallotEdit";
import VotersActions from "./VotersActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";

export function BallotEditForm({
	ballots,
	readOnly,
	setBusy,
}: {
	ballots: Ballot[];
	readOnly?: boolean;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();

	const [edited, setEdited] = React.useState<Multiple<Ballot> | null>(null);
	const [saved, setSaved] = React.useState<Multiple<Ballot> | null>(null);
	const [editedBallots, setEditedBallots] = React.useState<Ballot[]>([]);

	React.useEffect(() => {
		if (
			ballots.map((b) => b.id).join() ===
			editedBallots.map((b) => b.id).join()
		)
			return;
		let diff: Multiple<Ballot> | null = null;
		ballots.forEach((ballot) => {
			diff = deepMergeTagMultiple(diff || {}, ballot) as Multiple<Ballot>;
		});
		setEdited(diff);
		setSaved(diff);
		setEditedBallots(ballots);
	}, [ballots, editedBallots]);

	const triggerSave = useDebounce(() => {
		const changes = shallowDiff(saved!, edited!) as BallotChange;
		console.log(changes);
		let updates: BallotUpdate[] = [];
		if (Object.keys(changes).length > 0) {
			updates = ballots.map((b) => ({ id: b.id, changes }));
			dispatch(updateBallots(updates));
		}
		if (changes.groupId || changes.Project) {
			dispatch(
				setCurrentGroupProject({
					groupId: edited!.groupId,
					project: edited!.Project,
				})
			);
		}
		setSaved(edited);
	});

	const handleUpdate = (changes: BallotChange) => {
		if (readOnly) {
			console.warn("Ballot update while read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setEdited((edited) => ({ ...edited!, ...changes }));
		triggerSave();
	};

	if (!edited) return null;

	let ballot: Ballot | undefined;
	if (ballots.length === 1) ballot = ballots[0];

	const actions = ballot ? (
		<>
			{ballot.Type === BallotType.WG && (
				<VotersActions ballot={ballot} readOnly={readOnly} />
			)}
			<ResultsActions
				ballot={ballot}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
			<CommentsActions
				ballot={ballot}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
		</>
	) : null;

	return (
		<Form>
			<BallotEdit
				ballot={edited}
				updateBallot={handleUpdate}
				readOnly={readOnly}
			/>
			{actions}
		</Form>
	);
}
