import React from 'react';
import copyToClipboard from 'copy-html-to-clipboard';

import { ActionButton } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentsState, CommentResolution } from '../store/comments';
import type { EntityId, Dictionary } from 'dot11-components';

function setClipboard(selected: EntityId[], comments: Dictionary<CommentResolution>) {

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('CID')}
			${th('Page')}
			${th('Clause')}
			${th('Comment')}
			${th('Proposed Change')}
		</tr>`;
	const row = c => `
		<tr>
			${td(c.CID)}
			${td(c.Page)}
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
			${selected.map(id => row(comments[id])).join('')}
		</table>`;

	copyToClipboard(table, {asHtml: true});
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
