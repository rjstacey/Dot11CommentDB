import { useState, useEffect, useRef } from "react";
import { Form } from "react-bootstrap";

import type { BallotCreate, BallotChange } from "@/store/ballots";

import { BallotEdit } from "./BallotEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function BallotAddForm({
	edited,
	onChange,
	submit,
	cancel,
	readOnly,
}: {
	edited: BallotCreate;
	onChange: (changes: BallotChange) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const formRef = useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});

	async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form ref={formRef} noValidate onSubmit={onSubmit}>
			<BallotEdit edited={edited} onChange={onChange} readOnly={false} />
			{!readOnly && (
				<SubmitCancelRow
					submitLabel="Add"
					cancel={cancel}
					disabled={!formValid}
					busy={busy}
				/>
			)}
		</Form>
	);
}

export default BallotAddForm;
