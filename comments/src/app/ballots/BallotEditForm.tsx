import React from "react";
import { Form } from "react-bootstrap";
import { Multiple, shallowDiff, deepMergeTagMultiple } from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	updateBallots,
	setCurrentGroupProject,
	Ballot,
	BallotChange,
} from "@/store/ballots";

import { BallotEdit } from "./BallotEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import VotersActions from "./VotersActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";

export function BallotEditForm({
	ballots,
	defaultEdited,
	readOnly,
	setBusy,
}: {
	ballots: Ballot[];
	defaultEdited?: Ballot;
	readOnly?: boolean;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);

	React.useLayoutEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});

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
		setEdited(defaultEdited ? defaultEdited : diff);
		setSaved(diff);
		setEditedBallots(ballots);
	}, [ballots, editedBallots]);

	const hasChanges = React.useMemo(() => {
		const changes = shallowDiff(saved!, edited!) as BallotChange;
		return Object.keys(changes).length > 0;
	}, [saved, edited]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!hasChanges) return;
		const changes = shallowDiff(saved!, edited!) as BallotChange;
		if (Object.keys(changes).length > 0) {
			setBusy(true);
			const updates = ballots.map((b) => ({ id: b.id, changes }));
			await dispatch(updateBallots(updates));
			if (changes.groupId || changes.Project) {
				dispatch(
					setCurrentGroupProject({
						groupId: edited!.groupId,
						project: edited!.Project,
					})
				);
			}
			setSaved(edited);
			setBusy(false);
		}
	};

	const handleCancel = () => {
		setEdited(saved);
	};

	const handleUpdate = (changes: BallotChange) => {
		setEdited((edited) => ({ ...edited!, ...changes }));
	};

	if (!edited || !saved) return null;

	let ballot: Ballot | undefined;
	if (ballots.length === 1 && !hasChanges) ballot = ballots[0];

	const ballotActions = ballot ? (
		<>
			<VotersActions
				ballot={ballot}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
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
		<>
			<Form
				ref={formRef}
				noValidate
				onSubmit={handleSubmit}
				style={{ pointerEvents: readOnly ? "none" : undefined }}
			>
				<BallotEdit
					ballot={edited}
					original={saved}
					updateBallot={handleUpdate}
					readOnly={readOnly}
				/>
				{!readOnly && hasChanges && (
					<SubmitCancelRow
						submitLabel="Update"
						cancel={handleCancel}
						disabled={!formValid}
					/>
				)}
			</Form>
			{ballotActions}
		</>
	);
}
