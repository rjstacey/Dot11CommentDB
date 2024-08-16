import { useLocation, useNavigate } from "react-router-dom";
import type { EntityId } from "@reduxjs/toolkit";
import { ButtonGroup, ActionButton } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	selectMembersState,
	Member,
	MembersDictionary,
} from "../store/members";

import { copyChartToClipboard, downloadChart } from "../components/copyChart";
import MembersUpload from "./MembersUpload";
import MembersSummary from "./MembersSummary";
import MembersRoster from "./MembersRoster";
import MembersExport from "./MembersExport";
import { MembersTableActions } from "./table";

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

function MembersActions() {
	const navigate = useNavigate();
	const location = useLocation();
	const refresh = () => navigate(".", { replace: true });
	const { selected, entities: members } = useAppSelector(selectMembersState);

	const showChart = /chart$/.test(location.pathname);
	const setShowChart = (showChart: boolean) => {
		let path =
			location.pathname.replace("/chart", "") +
			(showChart ? "/chart" : "");
		navigate(path);
	};

	return (
		<div className="top-row">
			<MembersSummary />
			<div className="control-group">
				<MembersTableActions />
				<MembersRoster />
				<MembersExport />
				<ButtonGroup className="button-group">
					<div>Edit</div>
					<div style={{ display: "flex" }}>
						<ActionButton
							name="copy"
							title="Copy to clipboard"
							disabled={selected.length === 0}
							onClick={() => setClipboard(selected, members)}
						/>
						<MembersUpload />
					</div>
				</ButtonGroup>
				<ActionButton
					name="bi-bar-chart-line"
					title="Chart members"
					isActive={showChart}
					onClick={() => setShowChart(!showChart)}
				/>
				<ActionButton
					name="copy"
					title="Copy chart to clipboard"
					disabled={!showChart}
					onClick={copyChartToClipboard}
				/>
				<ActionButton
					name="export"
					title="Export chart"
					disabled={!showChart}
					onClick={downloadChart}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default MembersActions;
