import React from 'react';
import styled from '@emotion/styled';

import {
	Row, Col, List, Field, FieldLeft, Input,
	Icon, IconCollapse,
	isMultiple
} from 'dot11-components';

import AdHocSelector from './AdHocSelector';
import CommentGroupSelector from './CommentGroupSelector';
import {ResolutionEditor} from './ResolutionEditor';

import type { MultipleCommentResolution } from './CommentDetail';

import {
	getCommentStatus,
	CommentResolution,
} from '../store/comments';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const MultipleContainer = styled.span`
	color: GrayText;
	font-style: italic;
`;

const ShowMultiple = (props: React.ComponentProps<typeof MultipleContainer>) => <MultipleContainer {...props}>{MULTIPLE_STR}</MultipleContainer>

export const renderCommenter = (comment: MultipleCommentResolution) => {
	const commenter = comment.CommenterName
	if (isMultiple(commenter)) {
		return <ShowMultiple />
	}
	let vote: JSX.Element | undefined,
		mbs: JSX.Element | undefined;
	if (comment.Vote === 'Approve') {
		vote = <Icon type='vote-yes' />
	}
	else if (comment.Vote === 'Disapprove') {
		vote = <Icon type='vote-no' />
		if (comment.MustSatisfy)
			mbs = <span style={{color: 'red', fontSize: 'smaller', fontWeight: 'bold'}}>MBS</span>
	}
	return (
		<span>
			{commenter}
			{vote && <React.Fragment>&nbsp;{vote}</React.Fragment>}
			{mbs && <React.Fragment>&nbsp;{mbs}</React.Fragment>}
		</span>
	)
};

const renderEntry = (value: any) => {
	if (isMultiple(value))
		return <ShowMultiple />
	return <span>{value}</span>
};

const TextBlockContainer = styled.div`
	overflow-wrap: break-word;
	& p {
		margin: 8px 0;
	}
	& p:first-of-type {
		margin: 0;
	}
`;

const renderTextBlock = (value: string) => {
	if (!value)
		return ''
	if (isMultiple(value))
		return <ShowMultiple />
	return (
		<TextBlockContainer>
			{value.split('\n').map((line, i) => <p key={i}>{line}</p>)}
		</TextBlockContainer>
	)
}

const Categorization = ({
	comment,
	updateComment,
	showNotes,
	toggleShowNotes,
	readOnly
}: {
	comment: MultipleCommentResolution;
	updateComment: (changes: Partial<CommentResolution>) => void;
	showNotes: boolean;
	toggleShowNotes?: () => void;
	readOnly?: boolean;
}) =>
	<>
		<Row>
			<Col>
				<Field label='Ad-hoc:'>
					<AdHocSelector
						style={{flexBasis: 150}}
						value={isMultiple(comment.AdHoc) || isMultiple(comment.AdHocGroupId)? {GroupId: null, Name: ''}: {GroupId: comment.AdHocGroupId, Name: comment.AdHoc}}
						onChange={value => updateComment({AdHocGroupId: value.GroupId, AdHoc: value.Name})}
						placeholder={isMultiple(comment.AdHoc) || isMultiple(comment.AdHocGroupId)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Col>
			<Col>
				<Field label='Comment group:'>
					<CommentGroupSelector
						style={{flexBasis: 300}}
						value={isMultiple(comment.CommentGroup)? '': comment.CommentGroup || ''}
						onChange={value => updateComment({CommentGroup: value})}
						placeholder={isMultiple(comment.CommentGroup)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Col>
		</Row>
		<Row>
			<Col
				style={{
					width: '100%',
					position: 'relative',	// position toolbar
					paddingTop: 15			// make room for toolbar
				}}
			>
				<div style={{display: 'flex', flex: 1, justifyContent: 'space-between'}}>
					<label>Notes:</label>
					{toggleShowNotes && <IconCollapse isCollapsed={!showNotes} onClick={toggleShowNotes} />}
				</div>
				{showNotes &&
					<StyledNoteEditor
						value={isMultiple(comment.Notes)? '': comment.Notes}
						onChange={value => updateComment({Notes: value})}
						placeholder={isMultiple(comment.Notes)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				}
			</Col>
		</Row>
	</>


const StyledNoteEditor = styled(ResolutionEditor)`
	background-color: #fafafa;
	border: 1px solid #ddd;
	border-radius: 0 5px 5px 5px;
`;


function CommentPage({
	comment,
	setComment,
	readOnly
}: {
	comment: MultipleCommentResolution;
	setComment: (changes: Partial<CommentResolution>) => void;
	readOnly?: boolean;
}) {
	const pattern = '^\\d*\\.?\\d{0,2}$';

	const onChange: React.ChangeEventHandler<HTMLInputElement> = function(e) {
		const {value} = e.target;
		if (value.search(pattern) !== -1) {
			setComment({Page: value || null})
		}
	}

	let showOriginal = false;
	let original = '';
	if (!isMultiple(comment.Page) && !isMultiple(comment.C_Page) && !isMultiple(comment.C_Line)) {
		// Check if original page number is diffent
		let page: number | string = parseFloat(comment.C_Page) + parseFloat(comment.C_Line)/100
		if (isNaN(page))
			page = 0;
		page = page.toFixed(2);
		showOriginal = page !== comment.Page;
		original = comment.C_Page + '.' + comment.C_Line;
	}

	return (
		<>
			<Input
				type='text'
				size={10}
				value={isMultiple(comment.Page)? '': comment.Page || ''}
				onChange={onChange}
				pattern={pattern}
				placeholder={isMultiple(comment.Page)? MULTIPLE_STR: ''}
				disabled={readOnly}
			/>
			{showOriginal &&
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 'x-small', marginLeft: 5}} >
					<span>originally</span>
					<span>{original}</span>
				</div>}
		</>
	)
}

function CommentClause({
	comment,
	setComment,
	readOnly
}: {
	comment: MultipleCommentResolution;
	setComment: (changes: Partial<CommentResolution>) => void;
	readOnly?: boolean;
}) {
	// Check if original clause is different
	const hasChanged = comment.Clause !== comment.C_Clause;

	return (
		<>
			<Input
				type='text'
				size={10}
				value={isMultiple(comment.Clause)? '': comment.Clause || ''}
				onChange={(e) => setComment({Clause: e.target.value})}
				placeholder={isMultiple(comment.Clause)? MULTIPLE_STR: ''}
				disabled={readOnly}
			/>
			{hasChanged &&
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 'x-small', marginLeft: 5}} >
					<span>originally</span>
					<span>{comment.C_Clause}</span>
				</div>}
		</>
	)
}

export function CommentEdit({
	cids,
	comment,
	updateComment,
	showNotes,
	toggleShowNotes,
	readOnly,
}: {
	cids: string[];
	comment: MultipleCommentResolution;
	updateComment: (changes: Partial<CommentResolution>) => void;
	showNotes: boolean;
	toggleShowNotes?: () => void;
	readOnly?: boolean;
}) {
	const cidsStr = cids.join(', ');
	const cidsLabel = cids.length > 1? 'CIDs:': 'CID:';

	return (
		<>
			<Row>
				<FieldLeft label={cidsLabel}>{cidsStr}</FieldLeft>
				<FieldLeft label=''>{renderEntry(getCommentStatus(comment as CommentResolution))}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Commenter:'>{renderCommenter(comment)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Page/Line:'>
					<CommentPage
						comment={comment}
						setComment={updateComment}
						readOnly={readOnly}
					/>
				</FieldLeft>
				<FieldLeft label='Clause:'>
					<CommentClause
						comment={comment}
						setComment={updateComment}
						readOnly={readOnly}
					/>
				</FieldLeft>
				<FieldLeft label='Category:'>{renderEntry(comment.Category)}</FieldLeft>
			</Row>
			<Row>
				<List label='Comment:'>{renderTextBlock(comment.Comment)}</List>
			</Row>
			<Row>
				<List label='Proposed Change:'>{renderTextBlock(comment.ProposedChange)}</List>
			</Row>
			<Categorization
				comment={comment}
				updateComment={updateComment}
				showNotes={showNotes}
				toggleShowNotes={toggleShowNotes}
				readOnly={readOnly}
			/>
		</>
	)
}

export default CommentEdit;