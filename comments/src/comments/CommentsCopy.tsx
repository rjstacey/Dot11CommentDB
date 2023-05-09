import React from 'react';

import { ActionButton } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentsState, CommentResolution } from '../store/comments';
import type { EntityId, Dictionary } from 'dot11-components';

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
    const blob = new Blob([html], {type});
    const data = [new ClipboardItem({[type]: blob})];
	navigator.clipboard.write(data);
}

function setClipboard(ids: EntityId[], comments: Dictionary<CommentResolution>) {

	const td = (d: string) => `<td>${d}</td>`
	const th = (d: string) => `<th>${d}</th>`
	const header = `
		<tr>
			${th('CID')}
			${th('Page')}
			${th('Clause')}
			${th('Comment')}
			${th('Proposed Change')}
		</tr>`;
	const row = (c: CommentResolution) => `
		<tr>
			${td(c.CID)}
			${td(c.Page || '')}
			${td(c.Clause)}
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
			${ids.map(id => row(comments[id]!)).join('')}
		</table>`;

	copyHtmlToClipboard(table);
}

function CommentsCopy() {
	const {selected, entities} = useAppSelector(selectCommentsState);

	return (
		<ActionButton
			name='copy'
			title='Copy to clipboard'
			disabled={selected.length === 0}
			onClick={() => setClipboard(selected, entities)}
		/>
	)
}

export default CommentsCopy;
