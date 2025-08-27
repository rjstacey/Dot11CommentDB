import { useLocation } from "react-router";
import { Col, Button } from "react-bootstrap";
import type { EntityId } from "@reduxjs/toolkit";

import { useAppSelector } from "@/store/hooks";
import { selectMembersState, Member, MembersDictionary } from "@/store/members";

import { MembersUpload } from "./MembersUpload";
import { MembersSummary } from "./MembersSummary";
import { MembersRoster } from "./MembersRoster";
import { MembersExport } from "./MembersExport";

import { refresh } from "../loader";

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function setClipboard(selected: EntityId[], members: MembersDictionary) {
	const td = (d: string | number) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th("SAPIN")}
			${th("Family Name")}
			${th("Given Name")}
			${th("MI")}
			${th("Email")}
			${th("Status")}
		</tr>`;
	const row = (m: Member) => `
		<tr>
			${td(m.SAPIN)}
			${td(m.LastName)}
			${td(m.FirstName)}
			${td(m.MI)}
			${td(m.Email)}
			${td(m.Status)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map((sapin) => row(members[sapin]!)).join("")}
		</table>`;

	copyHtmlToClipboard(table);
}

export function MembersActions() {
	const location = useLocation();
	const rosterShown = /roster$/.test(location.pathname);
	const { selected, entities: members } = useAppSelector(selectMembersState);

	return (
		<>
			<MembersSummary xs="auto" style={{ order: 1 }} />
			<Col
				style={{ order: 4 }}
				className="d-flex justify-content-end align-items-center justify-self-stretch m-3 gap-2"
			>
				<MembersRoster />
				<MembersExport />
				<MembersUpload />
				<Button
					className="bi-copy"
					variant="outline-primary"
					name="copy"
					title="Copy selected members to clipboard"
					disabled={rosterShown || selected.length === 0}
					onClick={() => setClipboard(selected, members)}
				/>
				<Button
					className="bi-arrow-repeat"
					variant="outline-primary"
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</>
	);
}
