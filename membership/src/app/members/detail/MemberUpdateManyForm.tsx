import * as React from "react";
import { Row, Form } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { type MemberChange } from "@/store/members";
import type { MultipleMember } from "@/hooks/membersEdit";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { MemberBasicEdit } from "./MemberBasicEdit";

export function MemberUpdateManyForm({
	sapins,
	edited,
	saved,
	hasChanges,
	onChange,
	submit,
	cancel,
	readOnly,
}: {
	sapins: number[];
	edited: MultipleMember;
	saved?: MultipleMember;
	hasChanges: () => boolean;
	onChange: (changes: MemberChange) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		await submit();
		setBusy(false);
	};

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Row className="d-flex flex-column align-items-start w-100">
				<MemberBasicEdit
					sapins={sapins}
					edited={edited}
					saved={saved}
					onChange={onChange}
					readOnly={readOnly}
				/>
			</Row>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel="Update"
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
