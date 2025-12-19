import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { useAppSelector } from "@/store/hooks";
import type { MemberCreate, MemberChange } from "@/store/members";
import { selectIeeeMemberEntities } from "@/store/ieeeMembers";
import type { MultipleMember } from "@/hooks/membersEdit";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { IeeeMemberSelector } from "@/components/IeeeMemberSelector";
import { MemberBasicEdit } from "./MemberBasicEdit";

export function MemberAddForm({
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
	edited: MemberCreate;
	saved?: MultipleMember;
	hasChanges: () => boolean;
	onChange: (changes: MemberChange) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);
	const ieeeMemberEntities = useAppSelector(selectIeeeMemberEntities);

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

	function setMember(sapin: number) {
		const ieeeMember = ieeeMemberEntities[sapin];
		if (ieeeMember) {
			const member: MemberCreate = {
				...ieeeMember,
				Affiliation: "",
				Status: "Non-Voter",
			};
			onChange(member);
		}
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Row className="mb-3">
				<Form.Label column htmlFor="add-existing-ieee-member">
					Add existing IEEE member:
				</Form.Label>
				<Col xs="auto">
					<IeeeMemberSelector
						id="add-existing-ieee-member"
						value={edited.SAPIN as number}
						onChange={(sapin) => setMember(sapin)}
					/>
				</Col>
			</Row>

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
					submitLabel={"Add"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
