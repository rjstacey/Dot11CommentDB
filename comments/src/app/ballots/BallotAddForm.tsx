import React from "react";
import { Form } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	addBallot,
	setSelectedBallots,
	setCurrentGroupProject,
	Ballot,
} from "@/store/ballots";

import { BallotEdit } from "./BallotEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function BallotAddForm({
	defaultBallot,
	close,
	setBusy,
	readOnly,
}: {
	defaultBallot: Ballot;
	close?: () => void;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);
	const [ballot, setBallot] = React.useState(defaultBallot);

	React.useLayoutEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
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
		close?.();
	};

	const handleCancel = () => {
		setBallot(defaultBallot);
	};

	return (
		<Form ref={formRef} noValidate onSubmit={handleSubmit}>
			<BallotEdit
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
			{!readOnly && (
				<SubmitCancelRow
					submitLabel="Add"
					cancel={handleCancel}
					disabled={!formValid}
				/>
			)}
		</Form>
	);
}

export default BallotAddForm;
