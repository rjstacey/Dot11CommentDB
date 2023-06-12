import React from 'react';
import styled from '@emotion/styled';

import { Form, Row, List, ListItem, ActionButtonDropdown, DropdownRendererProps } from 'dot11-components';

import { useAppDispatch } from '../store/hooks';
import { exportCommentsSpreadsheet, CommentsSpreadsheetFormat, CommentsSpreadsheetStyle } from '../store/comments';
import { Ballot } from '../store/ballots';

const CommentsExportForm = styled(Form)`
	width: 450px;
`;

function CommentsExportDropdown({
	ballot,
	methods,
}: {
	ballot: Ballot;
} & DropdownRendererProps
) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [errMsg, setErrMsg] = React.useState('');
	const [spreadsheetFormat, setSpreadsheetFormat] = React.useState<CommentsSpreadsheetFormat>("modern");
	const [spreadsheetStyle, setSpreadsheetStyle] = React.useState<CommentsSpreadsheetStyle>("AllComments");
	const [busy, setBusy] = React.useState(false);

	async function submit() {
		const file = fileRef.current!.files![0];
		if (spreadsheetFormat === "myproject" && !file) {
			setErrMsg('Select MyProject comment spreadsheet file');
			return;
		}
		setBusy(true);
		await dispatch(exportCommentsSpreadsheet(ballot.id, spreadsheetFormat, spreadsheetStyle, file));
		setBusy(false);
		methods.close();
	}

	return (
		<CommentsExportForm
			title={`Export comments for ${ballot.BallotID} to Excel spreadsheet`}
			errorText={errMsg}
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<List
					label='Spreadsheet format:'
				>
					<ListItem>
						<input
							type="radio"
							id="modern"
							title={'Modern format'}
							checked={spreadsheetFormat === "modern"}
							onChange={e => setSpreadsheetFormat("modern")}
						/>
						<label htmlFor="modern">
							Modern spreadsheet
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="legacy"
							title={'Legacy format; compatible APS Comments Access Database.'}
							checked={spreadsheetFormat === "legacy"}
							onChange={e => setSpreadsheetFormat("legacy")}
						/>
						<label htmlFor="legacy">
							Legacy spreadsheet
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="myproject"
							title={'Export appoved resolutions for MyProject upload. Modifies an existing MyProject comment spreadsheet.'}
							checked={spreadsheetFormat === "myproject"}
							onChange={e => setSpreadsheetFormat("myproject")}
						/>
						<label htmlFor="myproject">
							All resolved comments for MyProject upload
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<List
					label='Spreadsheet style:'
				>
					<ListItem>
						<input
							type="radio"
							id="AllComments"
							title={'Export all comments. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === "AllComments"}
							onChange={e => setSpreadsheetStyle("AllComments")}
						/>
						<label htmlFor={"AllComments"}>
							All comments
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="TabPerAdHoc"
							title={'Export all comments plus a tab for each ad-hoc. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === "TabPerAdHoc"}
							onChange={e => setSpreadsheetStyle("TabPerAdHoc")}
						/>
						<label htmlFor="TabPerAdHoc">
							All comments plus one sheet per ad-hoc
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="TabPerCommentGroup"
							title={'Export all comments plus a tab for each comment group. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === "TabPerCommentGroup"}
							onChange={e => setSpreadsheetStyle("TabPerCommentGroup")}
						/>
						<label htmlFor="TabPerCommentGroup">
							All comments plus one sheet per comment group
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<input
					type='file'
					id='fileInput'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileRef}
					onClick={e => setErrMsg('')}
				/>
			</Row>
		</CommentsExportForm>
	)
}

function CommentsExport({ballot}: {ballot?: Ballot}) {
	return (
		<ActionButtonDropdown
			name='export'
			title='Export to file'
			disabled={!ballot}
			dropdownRenderer={(props) => <CommentsExportDropdown ballot={ballot!} {...props}/>}
		/>
	)
}

export default CommentsExport;