import * as React from "react";
import { Form } from "react-bootstrap";

import type { SyncedBreakout } from "@/store/imatBreakouts";
import type {
	BreakoutEntryMultiple,
	BreakoutEntryPartial,
} from "@/hooks/imatBreakoutsEdit";

import { BreakoutEdit } from "./BreakoutEdit";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function BreakoutEditForm({
	action,
	entry,
	onChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	entry: SyncedBreakout | BreakoutEntryMultiple;
	onChange: (changes: BreakoutEntryPartial) => void;
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const formRef = React.useRef<HTMLFormElement>(null);
	const [busy, setBusy] = React.useState(false);
	const [formValid, setFormValid] = React.useState(false);

	React.useEffect(() => {
		let valid = true;
		if (
			!entry.name ||
			!entry.groupId ||
			!entry.startSlotId ||
			!entry.endSlotId
		)
			valid = false;
		if (formValid !== valid) setFormValid(valid);
	}, [entry]);

	async function onSubmit(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form ref={formRef} noValidate validated onSubmit={onSubmit}>
			<BreakoutEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					cancel={cancel}
					disabled={!formValid}
					busy={busy}
				/>
			)}
		</Form>
	);
}
