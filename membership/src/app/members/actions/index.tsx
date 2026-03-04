import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectMembersState, Member, MembersDictionary } from "@/store/members";

import { MembersUpload } from "./MembersUpload";
import { MembersSummary } from "./MembersSummary";
import { MembersRoster } from "./MembersRoster";
import { MembersExport } from "./MembersExport";
import {
	membersSelectors,
	membersActions,
	tableColumns as membersColumns,
} from "../tableColumns";

import { refresh } from "../loader";

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function setClipboard(selected: number[], members: MembersDictionary) {
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
	const { selected, entities: members } = useAppSelector(selectMembersState);

	return (
		<Row className="w-100 m-3">
			<MembersSummary xs="auto" />
			<Col className="d-flex align-items-center justify-content-end">
				<Row>
					<SplitTableButtonGroup
						className="justify-content-end m-2"
						selectors={membersSelectors}
						actions={membersActions}
						columns={membersColumns}
					/>
					<Col
						xs="auto"
						className="d-flex justify-content-end align-items-center gap-2"
					>
						<MembersRoster />
						<MembersExport />
						<MembersUpload />
						<Button
							className="bi-copy"
							variant="outline-primary"
							name="copy"
							title="Copy selected members to clipboard"
							disabled={selected.length === 0}
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
