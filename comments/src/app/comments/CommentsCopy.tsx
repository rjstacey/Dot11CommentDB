import type { EntityId, Dictionary } from "@reduxjs/toolkit";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectCommentsState, CommentResolution } from "@/store/comments";

function copyHtmlToClipboard(html: string) {
	try {
		const type = "text/html";
		const blob = new Blob([html], { type });
		navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
	} catch (err: unknown) {
		if (err instanceof Error) alert(err.name + ": " + err.message);
	}
}

function escape(text: string) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function p(d: string) {
	const blocks = d.split("\n");
	return blocks.length > 1
		? blocks.map((d) => (d ? `<p>${d}</p>` : "")).join("")
		: d;
}
const td = (d: string) => `<td>${p(escape(d))}</td>`;
const th = (d: string) => `<th>${d}</th>`;

function setClipboard(
	ids: EntityId[],
	comments: Dictionary<CommentResolution>
) {
	const header = `
		<tr>
			${th("CID")}
			${th("Page")}
			${th("Clause")}
			${th("Comment")}
			${th("Proposed Change")}
		</tr>`;
	const row = (c: CommentResolution) => `
		<tr>
			${td(c.CID)}
			${td(c.Page ? c.Page.toString() : "")}
			${td(c.Clause ? c.Clause : "")}
			${td(c.Comment)}
			${td(c.ProposedChange)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${ids.map((id) => row(comments[id]!)).join("")}
		</table>`;

	copyHtmlToClipboard(table);
}

function CommentsCopy() {
	const { selected, entities } = useAppSelector(selectCommentsState);

	return (
		<Button
			variant="outline-secondary"
			className="bi-copy"
			title="Copy to clipboard"
			disabled={selected.length === 0}
			onClick={() => setClipboard(selected, entities)}
		/>
	);
}

export default CommentsCopy;
