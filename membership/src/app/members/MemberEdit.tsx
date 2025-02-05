import React from "react";
import { DateTime } from "luxon";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import {
	Form,
	Row,
	Col,
	Field,
	FieldLeft,
	Input,
	ConfirmModal,
	isMultiple,
	type Multiple,
	MULTIPLE,
} from "dot11-components";

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

import IeeeMemberSelector from "./IeeeMemberSelector";
import MemberSelector from "./MemberAllSelector";
import MemberStatus from "./MemberStatus";
import MemberContactInfo from "./MemberContactInfo";
import MemberAttendances from "../sessionParticipation/MemberAttendances";
import MemberBallotParticipation from "../ballotParticipation/MemberBallotParticipation";
import { hasChangesStyle } from "./utils";

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
		<table>
			<tbody>{rows}</tbody>
		</table>
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
	let tabIndex: number = useAppSelector(selectUiProperties).tabIndex || 0;
	if (basicOnly && tabIndex > 1) tabIndex = 0;
	const setTabIndex = (tabIndex: number) => {
		dispatch(setUiProperties({ tabIndex }));
	};

	const memberEntitiesWithParticipation = useAppSelector(
		selectMemberWithParticipationSummary
	);
	const memberWithParticipation = memberEntitiesWithParticipation[sapin];
	const sessionSumary = memberWithParticipation?.AttendancesSummary || "";
	const ballotSummary =
		memberWithParticipation?.BallotParticipationSummary || "";

	return (
		<Tabs
			style={{ width: "100%" }}
			onSelect={setTabIndex}
			selectedIndex={tabIndex}
		>
			<TabList>
				<Tab>Contact info</Tab>
				<Tab>Memberhip status</Tab>
				{!basicOnly && (
					<Tab>{`Session participation ${sessionSumary}`}</Tab>
				)}
				{!basicOnly && (
					<Tab>{`Ballot participation ${ballotSummary}`}</Tab>
				)}
			</TabList>
			<TabPanel>
				<MemberContactInfo
					edited={member}
					saved={saved}
					onChange={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberStatus
					member={member}
					saved={saved}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			{!basicOnly && (
				<TabPanel>
					<MemberAttendances SAPIN={sapin} readOnly={readOnly} />
				</TabPanel>
			)}
			{!basicOnly && (
				<TabPanel>
					<MemberBallotParticipation
						SAPIN={sapin}
						readOnly={readOnly}
					/>
				</TabPanel>
			)}
		</Tabs>
	);
}

function ExpandingInput({
	dataKey,
	member,
	saved,
	updateMember,
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
} & React.ComponentProps<typeof Input>) {
	const value = "" + member[dataKey];
	const savedValue: string | number | boolean | null | undefined =
		saved?.[dataKey] || "";
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Input
				{...props}
				type="text"
				style={{
					...hasChangesStyle(member, saved, dataKey),
					width: `${Math.max(value.length + 3, 22)}ch`,
					alignSelf: "flex-end",
				}}
				name={dataKey}
				value={isMultiple(value) ? "" : value}
				onChange={(e) => updateMember({ [dataKey]: e.target.value })}
				placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
			/>
			<span
				style={{ fontSize: "x-small", marginTop: 3, padding: "0 5px" }}
			>
				{savedValue}
			</span>
		</div>
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
	let sapinsEl: JSX.Element;
	let sapinsLabel: string;
	if (sapins.length > 1) {
		sapinsLabel = "SA PINs:";
		sapinsEl = <span>{sapins.join(", ")}</span>;
	} else {
		sapinsLabel = "SA PIN:";
		sapinsEl = (
			<Input
				type="text"
				value={member.SAPIN}
				onChange={(e) =>
					updateMember({ SAPIN: Number(e.target.value) })
				}
				pattern="\d+"
				disabled={basicOnly || readOnly}
				autoComplete="none"
			/>
		);
	}

	return (
		<>
			<Row>
				<FieldLeft id="sapin" label={sapinsLabel}>
					{sapinsEl}
				</FieldLeft>
				<FieldLeft label="Date added:">
					{renderDate(member.DateAdded)}
				</FieldLeft>
			</Row>
			<Row>
				<Field id="name" label="Name:">
					<ExpandingInput
						dataKey="Name"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Field>
			</Row>
			<Row>
				<Field id="familyname" label="Family name:">
					<ExpandingInput
						dataKey="LastName"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Given/MI name:">
					<div style={{ display: "flex", flexWrap: "wrap" }}>
						<ExpandingInput
							dataKey="FirstName"
							member={member}
							saved={saved}
							updateMember={updateMember}
							disabled={readOnly}
							autoComplete="none"
						/>
						<div style={{ padding: 5 }} />
						<ExpandingInput
							dataKey="MI"
							member={member}
							saved={saved}
							updateMember={updateMember}
							disabled={readOnly}
							autoComplete="none"
						/>
					</div>
				</Field>
			</Row>
			<Row>
				<Field id="email" label="Email:">
					<ExpandingInput
						dataKey="Email"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						pattern={emailPattern}
						autoComplete="none"
					/>
				</Field>
			</Row>
			<Row>
				<Field id="employer" label="Employer:">
					<ExpandingInput
						dataKey="Employer"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Field>
			</Row>
			<Row>
				<Field id="affiliation" label="Affiliation:">
					<ExpandingInput
						dataKey="Affiliation"
						member={member}
						saved={saved}
						updateMember={updateMember}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Field>
			</Row>
			{member.Status === "Obsolete" && (
				<Row>
					<Field label="Replaced by:">
						<MemberSelector
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
					</Field>
				</Row>
			)}
			{!hasMany && (
				<>
					{member.ObsoleteSAPINs &&
						!isMultiple(member.ObsoleteSAPINs) &&
						member.ObsoleteSAPINs.length > 0 && (
							<Row>
								<Col>
									<span className="label">Replaces:</span>
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

	let errMsg = "";
	if (!member.SAPIN) errMsg = "SA PIN not set";
	else if (!member.Name) errMsg = "Name not set";
	else if (!member.LastName) errMsg = "Family name not set";
	else if (!member.FirstName) errMsg = "Given name not set";
	else if (!new RegExp(emailPattern).test(member.Email))
		errMsg = "Invalid email address";

	let submitForm, cancelForm, submitLabel;
	if (action === "add") {
		submitLabel = "Add";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg, false);
				return;
			}
			add();
		};
		cancelForm = cancel;
	} else if (action === "update") {
		submitLabel = "Update";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg, false);
				return;
			}
			update();
		};
		cancelForm = cancel;
	}

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
		<Form
			className="main"
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			{action === "add" && !basicOnly && (
				<Row>
					<Field label="Add existing IEEE member:">
						<IeeeMemberSelector
							value={member.SAPIN as number}
							onChange={(sapin) => setMember(sapin)}
						/>
					</Field>
				</Row>
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
				<Row>
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
		</Form>
	);
}
