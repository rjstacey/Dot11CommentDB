import React from "react";
import { Form } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	addBallot,
	setSelectedBallots,
	setCurrentGroupProject,
	Ballot,
} from "@/store/ballots";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { BallotEdit } from "./BallotEdit";

export function BallotAddForm({
	defaultBallot,
	close,
	setBusy,
}: {
	defaultBallot: Ballot;
	close: () => void;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);
	const [ballot, setBallot] = React.useState(defaultBallot);

	React.useLayoutEffect(() => {
		const isValid = formRef.current?.checkValidity() || false;
		setFormValid(isValid);
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
	};

	console.log(formValid);

	return (
		<Form ref={formRef} noValidate onSubmit={handleSubmit}>
			<BallotEdit
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
			<SubmitCancelRow
				submitLabel="Add"
				cancel={close}
				disabled={!formValid}
			/>
		</Form>
	);
}

export default BallotAddForm;
