import { useLocation, useNavigate } from "react-router";
import type { EntityId } from "@reduxjs/toolkit";
import { ActionButton } from "dot11-components";

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
import { MyProjectRosterTableActions } from "./roster";
import { refresh } from "./route";

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
	const { selected, entities: members } = useAppSelector(selectMembersState);

	const showChart = /chart$/.test(location.pathname);
	const toggleShowChart = () => {
		navigate(showChart ? "" : "chart");
	};

	const showRoster = /roster$/.test(location.pathname);
	const toggleShowRoster = () => {
		navigate(showRoster ? "" : "roster");
	};

	const tableActionsEl = showChart ? (
		<div />
	) : showRoster ? (
		<MyProjectRosterTableActions />
	) : (
		<MembersTableActions />
	);

	const copyEl = showChart ? (
		<ActionButton
			name="copy"
			title="Copy chart to clipboard"
			disabled={!showChart}
			onClick={copyChartToClipboard}
		/>
	) : (
		<ActionButton
			name="copy"
			title="Copy selected members to clipboard"
			disabled={showRoster || selected.length === 0}
			onClick={() => setClipboard(selected, members)}
		/>
	);

	return (
		<div className="top-row">
			<MembersSummary />
			<div className="control-group">
				{tableActionsEl}
				<MembersRoster />
				<MembersExport />
				<MembersUpload />
				<ActionButton
					name="bi-r-circle"
					title="Show roster"
					isActive={showRoster}
					onClick={toggleShowRoster}
				/>
				<ActionButton
					name="bi-bar-chart-line"
					title="Chart members"
					isActive={showChart}
					onClick={toggleShowChart}
				/>
				{copyEl}
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
