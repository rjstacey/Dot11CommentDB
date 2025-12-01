import * as React from "react";
import { Tabs, Tab, Row, Form } from "react-bootstrap";

import { ConfirmModal, shallowDiff } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setUiProperties,
	selectUiProperties,
	type MemberChange,
} from "@/store/members";
import type { MultipleMember } from "@/edit/useMembersEdit";
import { useSessionParticipationEdit } from "@/edit/useSessionParticipationEdit";
import { useBallotParticipationEdit } from "@/edit/useBallotParticipationEdit";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { MemberBasicEdit } from "./MemberBasicEdit";
import { MemberContactEdit } from "./MemberContactEdit";
import { MemberStatusEdit } from "./MemberStatusEdit";
import { MemberSessionParticipationEdit } from "./MemberSessionParticipationEdit";
import { MemberBallotParticipationEdit } from "./MemberBallotParticipationEdit";

const basicKeys: (keyof MemberChange)[] = [
	"SAPIN",
	"Name",
	"FirstName",
	"MI",
	"LastName",
	"Email",
	"Employer",
	"Affiliation",
] as const;
const hasBasicChanges = (changeKeys: string[]) =>
	basicKeys.some((dataKey) => changeKeys.includes(dataKey));

const contactKeys: (keyof MemberChange)[] = [
	"ContactInfo",
	"ContactEmails",
] as const;
const hasContactChanges = (changeKeys: string[]) =>
	contactKeys.some((dataKey) => changeKeys.includes(dataKey));

const statusKeys: (keyof MemberChange)[] = [
	"Status",
	"StatusChangeOverride",
	"StatusChangeDate",
	"StatusChangeHistory",
] as const;
const hasStatusChanges = (changeKeys: string[]) =>
	statusKeys.some((dataKey) => changeKeys.includes(dataKey));

function titleWithChangeMark(title: string, hasChanges: boolean) {
	const changesStyle: React.CSSProperties = { backgroundColor: "#ffff003d" };
	return <span style={hasChanges ? changesStyle : undefined}>{title}</span>;
}

export function MemberUpdateOneForm({
	sapins,
	edited,
	saved,
	hasChanges: memberHasChanges,
	onChange: memberOnChange,
	submit: memberSubmit,
	cancel: memberCancel,
	readOnly,
}: {
	sapins: number[];
	edited: MultipleMember;
	saved: MultipleMember;
	hasChanges: () => boolean;
	onChange: (changes: MemberChange) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const tabKey = useAppSelector(selectUiProperties).tabKey as string;
	const setTabKey = (tabKey: string | null) => {
		dispatch(setUiProperties({ tabKey }));
	};

	const [busy, setBusy] = React.useState(false);

	const {
		state: sessionParticipationState,
		hasChanges: sessionParticipationHasChanges,
		onChange: sessionParticipationOnChange,
		submit: sessionParticipationSubmit,
		cancel: sessionParticipationCancel,
	} = useSessionParticipationEdit(sapins[0]);

	const {
		state: ballotParticipationState,
		hasChanges: ballotParticipationHasChanges,
		onChange: ballotParticipationOnChange,
		submit: ballotParticipationSubmit,
		cancel: ballotParticipationCancel,
	} = useBallotParticipationEdit(sapins[0]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		await memberSubmit();
		await sessionParticipationSubmit();
		await ballotParticipationSubmit();
		setBusy(false);
	};

	const handleCancel = () => {
		memberCancel();
		sessionParticipationCancel();
		ballotParticipationCancel();
	};

	const hasChanges =
		memberHasChanges() ||
		sessionParticipationHasChanges() ||
		ballotParticipationHasChanges();

	const changeKeys = saved ? Object.keys(shallowDiff(edited, saved)) : [];

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Row className="d-flex flex-column align-items-start w-100">
				<Tabs onSelect={setTabKey} activeKey={tabKey} fill>
					<Tab
						eventKey="basic"
						title={titleWithChangeMark(
							"Basic",
							hasBasicChanges(changeKeys)
						)}
					>
						<MemberBasicEdit
							sapins={sapins}
							edited={edited}
							saved={saved}
							onChange={memberOnChange}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab
						eventKey="contact"
						title={titleWithChangeMark(
							"Contact",
							hasContactChanges(changeKeys)
						)}
					>
						<MemberContactEdit
							edited={edited}
							saved={saved}
							onChange={memberOnChange}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab
						eventKey="status"
						title={titleWithChangeMark(
							"Status",
							hasStatusChanges(changeKeys)
						)}
					>
						<MemberStatusEdit
							edited={edited}
							saved={saved}
							onChange={memberOnChange}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab
						eventKey="sessions"
						title={titleWithChangeMark(
							"Sessions",
							sessionParticipationHasChanges()
						)}
					>
						<MemberSessionParticipationEdit
							SAPIN={sapins[0]}
							session_ids={sessionParticipationState.session_ids}
							edited={sessionParticipationState.edited}
							onChange={sessionParticipationOnChange}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab
						eventKey="ballots"
						title={titleWithChangeMark(
							"Ballots",
							ballotParticipationHasChanges()
						)}
					>
						<MemberBallotParticipationEdit
							SAPIN={sapins[0]}
							series_ids={ballotParticipationState.series_ids}
							edited={ballotParticipationState.edited}
							onChange={ballotParticipationOnChange}
							readOnly={readOnly}
						/>
					</Tab>
				</Tabs>
			</Row>
			{hasChanges && (
				<SubmitCancelRow
					submitLabel="Update"
					cancel={handleCancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
