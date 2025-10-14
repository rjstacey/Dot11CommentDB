import { Counts } from "./reportData";

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

export function renderTableToClipboard(data: Counts[]) {
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
