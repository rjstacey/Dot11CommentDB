import React from "react";
import { Tabs, Tab } from "react-bootstrap";

import { shallowDiff } from "@common";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	setUiProperties,
	selectUiProperties,
	type Member,
	type MemberChange,
} from "@/store/members";

import { MemberBasicEdit } from "./MemberBasicEdit";
import { MemberStatusEdit } from "./MemberStatusEdit";
import { MemberContactEdit } from "./MemberContactEdit";
import { MemberSessionParticipation } from "../../sessionParticipation/MemberSessionParticipation";
import MemberBallotParticipation from "../../ballotParticipation/MemberBallotParticipation";
import type { EditAction, MultipleMember } from "./useMembersEdit";

const basicKeys: (keyof Member)[] = [
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

const contactKeys: (keyof Member)[] = ["ContactInfo", "ContactEmails"] as const;
const hasContactChanges = (changeKeys: string[]) =>
	contactKeys.some((dataKey) => changeKeys.includes(dataKey));

const statusKeys: (keyof Member)[] = [
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

export function MemberEditTabs({
	action,
	sapins,
	edited,
	saved,
	onChange,
	readOnly,
}: {
	action: EditAction;
	sapins: number[];
	edited: MultipleMember;
	saved?: MultipleMember;
	onChange: (changes: MemberChange) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const tabKey = useAppSelector(selectUiProperties).tabKey as string;
	const setTabKey = (tabKey: string | null) => {
		dispatch(setUiProperties({ tabKey }));
	};

	if (sapins.length > 1 || action === "add") {
		return (
			<MemberBasicEdit
				sapins={action === "add" ? [edited.SAPIN as number] : sapins}
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
		);
	}

	const changeKeys = Object.keys(shallowDiff(edited, saved!));

	return (
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
					onChange={onChange}
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
					onChange={onChange}
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
					onChange={onChange}
					readOnly={readOnly}
				/>
			</Tab>
			<Tab eventKey="sessions" title="Sessions">
				<MemberSessionParticipation
					SAPIN={sapins[0]}
					readOnly={readOnly}
				/>
			</Tab>
			<Tab eventKey="ballots" title="Ballots">
				<MemberBallotParticipation
					SAPIN={sapins[0]}
					readOnly={readOnly}
				/>
			</Tab>
		</Tabs>
	);
}
