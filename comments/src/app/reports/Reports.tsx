import React from "react";

import { Nav, NavLink, Container } from "react-bootstrap";
import { Counts, Report, reports, useReportData } from "./reportData";
import ReportsActions from "./actions";

import styles from "./reports.module.css";

function renderTable(data: Counts[]) {
	if (data.length === 0) return <span>Empty</span>;

	const nCol = Object.keys(data[0]).length;
	const header = (
		<tr>
			{Object.keys(data[0]).map((d, i) => (
				<th key={i}>
					<span>{d}</span>
				</th>
			))}
		</tr>
	);
	const row = (r: Counts, i: number) => (
		<tr key={i}>
			{Object.values(r).map((d, i) => (
				<td key={i}>
					<span>{d}</span>
				</td>
			))}
		</tr>
	);
	return (
		<table
			className={styles.table}
			style={{
				gridTemplateColumns: `repeat(${nCol}, auto)`,
				borderCollapse: "collapse",
			}}
			cellPadding="5"
			border={1}
		>
			<thead>{header}</thead>
			<tbody>{data.map(row)}</tbody>
		</table>
	);
}

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function renderTableToClipboard(data: Counts[]) {
	if (data.length === 0) return;

	const header = `<tr>${Object.keys(data[0])
		.map((d) => `<th>${d}</th>`)
		.join("")}</tr>`;
	const row = (r: Counts) =>
		`<tr>${Object.values(r)
			.map((d) => `<td>${d}</td>`)
			.join("")}</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top; text-align: right;}
		</style>
		<table cellpadding="5" border="1">
			<thead>${header}</thead>
			<tbody>${data.map(row).join("")}</tbody>
		</table>`;

	copyHtmlToClipboard(table);
}

function Reports() {
	const [report, setReport] = React.useState<Report | null>(null);

	const data = useReportData(report);

	const ReportButton = ({
		report: thisReport,
		label,
	}: {
		report: Report;
		label: string;
	}) => (
		<NavLink
			onClick={() => setReport(thisReport)}
			active={thisReport === report}
		>
			{label}
		</NavLink>
	);

	return (
		<>
			<ReportsActions onCopy={() => renderTableToClipboard(data)} />
			<Container fluid className="d-flex flex-grow overflow-hidden">
				<Nav variant="underline" className="flex-column me-3">
					<h3>Select a report:</h3>
					{reports.map((report) => (
						<ReportButton
							key={report}
							report={report}
							label={report}
						/>
					))}
				</Nav>
				<Container className="d-flex flex-grow overflow-auto">
					{renderTable(data)}
				</Container>
			</Container>
		</>
	);
}

export default Reports;
