import * as React from "react";
import {
	Tabs,
	Tab,
	Table,
	Row,
	Col,
	Form,
	Button,
	Spinner,
} from "react-bootstrap";
import { DateTime } from "luxon";

import { ConfirmModal } from "@common";
import { isMultiple, type Multiple, MULTIPLE } from "@common";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	setUiProperties,
	selectUiProperties,
	selectMemberEntities,
	selectMemberWithParticipationSummary,
	type Member,
	type MemberCreate,
	type ContactInfo,
} from "@/store/members";
import { selectIeeeMemberEntities } from "@/store/ieeeMembers";

import { MemberSessionParticipation } from "../../sessionParticipation/MemberSessionParticipation";
import MemberBallotParticipation from "../../ballotParticipation/MemberBallotParticipation";

import { MemberStatus } from "./MemberStatus";
import { IeeeMemberSelector } from "./IeeeMemberSelector";
import { MemberAllSelector } from "./MemberAllSelector";
import { MemberContactInfo } from "./MemberContactInfo";
import { hasChangesStyle } from "../utils";

export type MultipleMember = Multiple<
	Omit<MemberCreate, "StatusChangeHistory" | "ContactEmails" | "ContactInfo">
> & {
	StatusChangeHistory: Member["StatusChangeHistory"];
	ContactEmails: Member["ContactEmails"];
	ContactInfo: Multiple<ContactInfo> | null;
	ReplacedBySAPIN: Member["ReplacedBySAPIN"] | typeof MULTIPLE;
	ObsoleteSAPINs: Member["ObsoleteSAPINs"] | typeof MULTIPLE;
};

export type EditAction = "view" | "update" | "add";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function ShortMemberSummary({ sapins }: { sapins: number[] }) {
	const members = useAppSelector(selectMemberEntities);

	const rows = sapins.map((sapin) => {
		const m = members[sapin];
		if (!m) return null;
		return (
			<tr key={m.SAPIN}>
				<td>{m.SAPIN}</td>
				<td>{m.Name}</td>
				<td>{m.Email}</td>
				<td>{m.Affiliation}</td>
				<td>{m.Status}</td>
				<td>{m.DateAdded ? displayDate(m.DateAdded) : "-"}</td>
			</tr>
		);
	});
	return (
		<Table size="sm" borderless responsive>
			<tbody>{rows}</tbody>
		</Table>
	);
}

const renderDate = (value: string | null | undefined) =>
	isMultiple(value) ? (
		<i>{MULTIPLE_STR}</i>
	) : value ? (
		displayDate(value)
	) : (
		<i>{BLANK_STR}</i>
	);

export function MemberDetailInfo({
	sapin,
	member,
	saved,
	updateMember,
	readOnly,
	basicOnly,
}: {
	sapin: number;
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	let tabKey: string = useAppSelector(selectUiProperties).tabKey;
	if (
		![
			"contact-info",
			"membership-status",
			"ballot-participation",
			"session-participation",
		].includes(tabKey)
	) {
		tabKey = "contact-info";
	}
	if (
		basicOnly &&
		tabKey !== "contact-info" &&
		tabKey !== "membership-status"
	) {
		tabKey = "contact-info";
	}
	const setTabKey = (tabKey: string | null) => {
		dispatch(setUiProperties({ tabKey }));
	};

	const memberEntitiesWithParticipation = useAppSelector(
		selectMemberWithParticipationSummary
	);
	const memberWithParticipation = memberEntitiesWithParticipation[sapin];
	const sessionSumary = memberWithParticipation?.AttendancesSummary || "";
	const ballotSummary =
		memberWithParticipation?.BallotParticipationSummary || "";

	return (
		<Tabs onSelect={setTabKey} activeKey={tabKey} fill>
			<Tab eventKey="contact-info" title="Contact Info">
				<MemberContactInfo
					edited={member}
					saved={saved}
					onChange={updateMember}
					readOnly={readOnly}
				/>
			</Tab>
			<Tab eventKey="membership-status" title="Membership Status">
				<MemberStatus
					member={member}
					saved={saved}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</Tab>
			{!basicOnly && (
				<Tab
					eventKey="session-participation"
					title={`Session participation ${sessionSumary}`}
				>
					<MemberSessionParticipation
						SAPIN={sapin}
						readOnly={readOnly}
					/>
				</Tab>
			)}
			{!basicOnly && (
				<Tab
					eventKey="ballot-participation"
					title={`Ballot participation ${ballotSummary}`}
				>
					<MemberBallotParticipation
						SAPIN={sapin}
						readOnly={readOnly}
					/>
				</Tab>
			)}
		</Tabs>
	);
}

function ExpandingInput({
	dataKey,
	member,
	saved,
	updateMember,
	invalidFeedback,
	...props
}: {
	dataKey: keyof Omit<
		MultipleMember,
		| "ContactInfo"
		| "ContactEmails"
		| "ObsoleteSAPINs"
		| "StatusChangeHistory"
	>;
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	invalidFeedback?: string;
} & React.ComponentProps<typeof Form.Control>) {
	const value = "" + member[dataKey];
	const savedValue: string | number | boolean | null | undefined =
		saved?.[dataKey] || "";
	return (
		<Col className="d-flex flex-column">
			<Form.Control
				{...props}
				type="text"
				style={{
					...hasChangesStyle(member, saved, dataKey),
					//width: `${Math.max(value.length + 3, 22)}ch`,
					alignSelf: "flex-end",
				}}
				name={dataKey}
				value={isMultiple(value) ? "" : value}
				onChange={(e) => updateMember({ [dataKey]: e.target.value })}
				placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
			/>
			{invalidFeedback && (
				<Form.Control.Feedback type="invalid">
					{invalidFeedback}
				</Form.Control.Feedback>
			)}
			<Form.Text className="text-muted">{savedValue}</Form.Text>
		</Col>
	);
}

export const emailPattern =
	"[A-Za-z0-9.\\-_%+]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}";

export function MemberBasicInfo({
	sapins,
	member,
	saved,
	updateMember,
	readOnly,
	basicOnly,
}: {
	sapins: number[];
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	const hasMany = sapins.length > 1;
	let sapinEl: JSX.Element;
	if (hasMany) {
		sapinEl = (
			<>
				<Form.Label as="span" column xs={4}>
					SA PINs:
				</Form.Label>
				<Col>
					<span>{sapins.join(", ")}</span>
				</Col>
			</>
		);
	} else {
		sapinEl = (
			<>
				<Form.Label column xs={4}>
					SA PIN:
				</Form.Label>
				<Col>
					<Form.Control
						type="text"
						value={member.SAPIN || ""}
						onChange={(e) =>
							updateMember({ SAPIN: Number(e.target.value) })
						}
						pattern="\d+"
						disabled={basicOnly || readOnly}
						autoComplete="none"
						required
					/>
					<Form.Control.Feedback type="invalid">
						SA PIN not set
					</Form.Control.Feedback>
				</Col>
			</>
		);
	}

	return (
		<>
			<Row className="mb-3">
				<Form.Group
					as={Col}
					xs={5}
					controlId="sapin"
					className="d-flex align-items-center"
				>
					{sapinEl}
				</Form.Group>
				<Form.Group
					as={Col}
					xs={7}
					controlId="dateAdded"
					className="d-flex align-items-center"
				>
					<Form.Label as="span" column xs={5}>
						Date added:
					</Form.Label>
					<Col>
						<Form.Control as="div">
							{renderDate(member.DateAdded)}
						</Form.Control>
					</Col>
				</Form.Group>
			</Row>
			<Form.Group as={Row} controlId="name" className="mb-3">
				<Form.Label column xs={3}>
					Name:
				</Form.Label>
				<ExpandingInput
					dataKey="Name"
					member={member}
					saved={saved}
					updateMember={updateMember}
					disabled={readOnly}
					autoComplete="none"
				/>
			</Form.Group>
			<Form.Group as={Row} controlId="familyName" className="mb-3">
				<Form.Label column xs={3}>
					Family name:
				</Form.Label>
				<ExpandingInput
					dataKey="LastName"
					member={member}
					saved={saved}
					updateMember={updateMember}
					disabled={readOnly}
					autoComplete="none"
					required
					invalidFeedback="Family name not set"
				/>
			</Form.Group>
			<Row className="mb-3">
				<Form.Group
					as={Col}
					xs={8}
					controlId="givenName"
					className="d-flex"
				>
					<Form.Label column xs={5}>
						Given name:
					</Form.Label>
					<ExpandingInput
						dataKey="FirstName"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
						required
						invalidFeedback="Given name not set"
					/>
				</Form.Group>
				<Form.Group as={Col} xs={4} controlId="mi" className="d-flex">
					<Form.Label column xs={3}>
						MI:
					</Form.Label>
					<ExpandingInput
						dataKey="MI"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Form.Group>
			</Row>
			<Form.Group as={Row} controlId="email" className="mb-3">
				<Form.Label column xs={2}>
					Email:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Email"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						pattern={emailPattern}
						autoComplete="none"
						required
						invalidFeedback="Invalid email address"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="employer" className="mb-3">
				<Form.Label column xs={3}>
					Employer:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Employer"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="affiliation" className="mb-3">
				<Form.Label column xs={3}>
					Affiliation:
				</Form.Label>
				<Col>
					<ExpandingInput
						dataKey="Affiliation"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			{member.Status === "Obsolete" && (
				<Form.Group as={Row}>
					<Form.Label column>Replaced by:</Form.Label>
					<Col>
						<MemberAllSelector
							style={{ maxWidth: 400, flex: 1 }}
							value={
								isMultiple(member.ReplacedBySAPIN)
									? null
									: member.ReplacedBySAPIN || null
							}
							onChange={(value) =>
								updateMember({
									ReplacedBySAPIN: value || undefined,
								})
							}
							placeholder={
								isMultiple(member.ReplacedBySAPIN)
									? MULTIPLE_STR
									: BLANK_STR
							}
							readOnly={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
			{!hasMany && (
				<>
					{member.ObsoleteSAPINs &&
						!isMultiple(member.ObsoleteSAPINs) &&
						member.ObsoleteSAPINs.length > 0 && (
							<Row>
								<Col>
									<Form.Label as="span">Replaces:</Form.Label>
									<ShortMemberSummary
										sapins={member.ObsoleteSAPINs}
									/>
								</Col>
							</Row>
						)}
				</>
			)}
		</>
	);
}

function SubmitCancel({
	action,
	busy,
	cancel,
}: {
	action: EditAction;
	busy?: boolean;
	cancel?: () => void;
}) {
	if (action !== "add" && action !== "update") return null;
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit">
					{busy && <Spinner animation="border" size="sm" />}
					{action === "add" ? "Add" : "Update"}
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
		</Form.Group>
	);
}

export function MemberEntryForm({
	action,
	sapins,
	member,
	saved,
	updateMember,
	add,
	update,
	cancel,
	readOnly,
	basicOnly,
}: {
	add: () => void;
	update: () => void;
	cancel: () => void;
	action: EditAction;
	sapins: number[];
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	const ieeeMemberEntities = useAppSelector(selectIeeeMemberEntities);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		if (action === "add") add();
		else if (action === "update") update();
	};

	function changeMember(changes: Partial<Member>) {
		const name =
			member.FirstName +
			(member.MI ? ` ${member.MI} ` : " ") +
			member.LastName;
		if (
			("LastName" in changes ||
				"FirstName" in changes ||
				"MI" in changes) &&
			member.Name === name
		) {
			const LastName =
				"LastName" in changes ? changes.LastName : member.LastName;
			const MI = "MI" in changes ? changes.MI : member.MI;
			const FirstName =
				"FirstName" in changes ? changes.FirstName : member.FirstName;
			changes.Name = FirstName + (MI ? ` ${MI} ` : " ") + LastName;
		}
		updateMember(changes);
	}

	function setMember(sapin: number) {
		const ieeeMember = ieeeMemberEntities[sapin];
		if (ieeeMember) {
			const member: MemberCreate = {
				...ieeeMember,
				Affiliation: "",
				Status: "Non-Voter",
			};
			updateMember(member);
		}
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			{action === "add" && !basicOnly && (
				<Form.Group as={Row}>
					<Form.Label column>Add existing IEEE member:</Form.Label>
					<Col xs="auto">
						<IeeeMemberSelector
							value={member.SAPIN as number}
							onChange={(sapin) => setMember(sapin)}
						/>
					</Col>
				</Form.Group>
			)}
			<MemberBasicInfo
				sapins={action === "add" ? [member.SAPIN as number] : sapins}
				member={member}
				saved={saved}
				updateMember={changeMember}
				readOnly={readOnly}
				basicOnly={basicOnly}
			/>
			{sapins.length <= 1 && (
				<Row className="d-flex flex-column align-items-start w-100">
					<MemberDetailInfo
						sapin={sapins[0]}
						member={member}
						saved={saved}
						updateMember={updateMember}
						readOnly={readOnly}
						basicOnly={basicOnly || action === "add"}
					/>
				</Row>
			)}
			<SubmitCancel action={action} cancel={cancel} busy={false} />
		</Form>
	);
}
