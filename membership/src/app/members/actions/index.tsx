import { useLocation, useNavigate } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import type { EntityId } from "@reduxjs/toolkit";

import { useAppSelector } from "@/store/hooks";
import { selectMembersState, Member, MembersDictionary } from "@/store/members";

import { MembersUpload } from "./MembersUpload";
import { MembersSummary } from "./MembersSummary";
import { MembersRoster } from "./MembersRoster";
import { MembersExport } from "./MembersExport";
import { MembersTableActions } from "../table";
import { RosterTableActions } from "../roster";
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
	const navigate = useNavigate();
	const location = useLocation();
	const { selected, entities: members } = useAppSelector(selectMembersState);

	const showRoster = /roster$/.test(location.pathname);
	const toggleShowRoster = () => {
		console.log("toggle show roster");
		navigate(showRoster ? "" : "roster");
	};

	const tableActionsEl = showRoster ? (
		<RosterTableActions />
	) : (
		<MembersTableActions />
	);

	return (
		<Row className="w-100">
			<Col md={12} lg={4}>
				<MembersSummary />
			</Col>
			<Col md={12} lg={8}>
				<Row>
					<Col
						xs={{ span: 12, order: "last" }}
						md={{ span: "auto", order: "first" }}
					>
						{tableActionsEl}
					</Col>
					<Col>
						<div className="d-flex">
							<MembersRoster />
							<MembersExport />
							<MembersUpload />
						</div>
					</Col>
					<Col className="d-flex justify-content-end align-items-center gap-2">
						<Button
							variant="outline-primary"
							title="Show roster"
							active={showRoster}
							onClick={toggleShowRoster}
						>
							Show Roster
						</Button>
						<Button
							className="bi-copy"
							variant="outline-primary"
							name="copy"
							title="Copy selected members to clipboard"
							disabled={showRoster || selected.length === 0}
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
				</Row>
			</Col>
		</Row>
	);
}
