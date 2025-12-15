import React from "react";
import { Form } from "react-bootstrap";

import type { BallotChange } from "@/store/ballots";
import type { BallotMultiple } from "@/hooks/ballotsEdit";

import { BallotEdit } from "./BallotEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function BallotEditForm({
	edited,
	saved,
	onChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	edited: BallotMultiple;
	saved: BallotMultiple;
	onChange: (changes: BallotChange) => void;
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form
			ref={formRef}
			noValidate
			onSubmit={onSubmit}
			style={{ pointerEvents: readOnly ? "none" : undefined }}
		>
			<BallotEdit
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel="Update"
					cancel={cancel}
					disabled={!formValid}
					busy={busy}
				/>
			)}
		</Form>
	);
}
