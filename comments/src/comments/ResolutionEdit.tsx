import React from 'react';
import styled from '@emotion/styled';

import {
	Row, Col, List, ListItem, Field, Checkbox, Input,
	isMultiple, MULTIPLE
} from 'dot11-components';

import AssigneeSelector from './AssigneeSelector';
import SubmissionSelector from './SubmissionSelector';
import {ResolutionEditor} from './ResolutionEditor';

import type { MultipleCommentResolution } from './CommentDetail';
import type { Resolution, ResnStatusType } from '../store/comments';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const AssigneeAndSubmission = ({
	style,
	className,
	resolution,
	updateResolution,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	resolution: MultipleCommentResolution;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) => 
	<Col
		style={style}
		className={className}
	>
		<Row>
			<Field label='Assignee:'>
				<AssigneeSelector
					style={{flexBasis: 200, flexGrow: 1}}
					value={(isMultiple(resolution.AssigneeSAPIN) || isMultiple(resolution.AssigneeName))?
						{SAPIN: 0, Name: ''}:
						{SAPIN: resolution.AssigneeSAPIN || 0, Name: resolution.AssigneeName || ''}}
					onChange={({SAPIN, Name}) => updateResolution({AssigneeSAPIN: SAPIN, AssigneeName: Name})}
					placeholder={isMultiple(resolution.AssigneeSAPIN || resolution.AssigneeName)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Submission:'>
				<SubmissionSelector
					style={{flexBasis: 200}}
					value={isMultiple(resolution.Submission)? '': resolution.Submission || ''}
					onChange={value => updateResolution({Submission: value})}
					placeholder={isMultiple(resolution.Submission)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
	</Col>

function ResolutionApproval({
	style,
	className,
	resolution,
	updateResolution,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	resolution: MultipleCommentResolution;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {

	const changeApproved: React.ChangeEventHandler<HTMLInputElement> = (e) => {
 		let value: string;
 		if (e.target.name === 'Approved')
			value = e.target.checked? (new Date()).toDateString(): '';
		else
			value = e.target.value;
            updateResolution({ApprovedByMotion: value})
	}

	const value = isMultiple(resolution.ApprovedByMotion)? '': resolution.ApprovedByMotion || '';
	const placeholder = isMultiple(resolution.ApprovedByMotion)? MULTIPLE_STR: BLANK_STR;

	return (
		<Col
			style={style}
			className={className}
		>
			<List>
				<ListItem>
					<Checkbox
						name='ReadyForMotion'
						indeterminate={isMultiple(resolution.ReadyForMotion)}
						checked={!!resolution.ReadyForMotion}
						onChange={e => updateResolution({ReadyForMotion: e.target.checked})}
						disabled={readOnly}
					/>
					<label>Ready for motion</label>
				</ListItem>
				<ListItem>
					<Checkbox
						name='Approved'
						indeterminate={isMultiple(resolution.ApprovedByMotion)}
						checked={!!resolution.ApprovedByMotion}
						onChange={changeApproved}
						disabled={readOnly}
					/>
					<label>Approved by motion: </label>
					<Input
						type='search'
						size={value.length || placeholder.length}
						name='ApprovedByMotion'
						value={value}
						onChange={changeApproved}
						placeholder={placeholder}
						disabled={readOnly}
					/>
				</ListItem>
			</List>
		</Col>
	)
}

const ResnStatusContainer = styled.div`
	display: flex;
	& div {
		display: flex;
		align-items: center;
		margin: 5px 10px;
	}
`;

function ResnStatus({
	style,
	className,
	value,
	onChange,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	value: ResnStatusType | null | typeof MULTIPLE;
	onChange: (value: ResnStatusType | null) => void;
	readOnly?: boolean;
}) {
	const handleChange: React.ChangeEventHandler<HTMLInputElement> = e => onChange(e.target.checked? (e.target.value as ResnStatusType): null);

	return (
		<ResnStatusContainer
			style={style}
			className={className}
		>
			<div>
				<Checkbox
					name='ResnStatus'
					value='A'
					checked={value === 'A'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>ACCEPTED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='V'
					checked={value === 'V'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>REVISED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='J'
					checked={value === 'J'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>REJECTED</label>
			</div>
		</ResnStatusContainer>
	)
}

const resnColor = {
	'A': '#d3ecd3',
	'V': '#f9ecb9',
	'J': '#f3c0c0'
}

const StyledResnStatus = styled(ResnStatus)`
	width: fit-content;
	background-color: ${({value}) => (value && resnColor[value]) || '#fafafa'};
	border: 1px solid #ddd;
	border-bottom: none;
	border-radius: 5px 5px 0 0;
	position: relative;
	bottom: -1px;
	z-index: 1;
`;

const StyledResolutionContainer = styled(Col)<{readOnly?: boolean}>`
	:hover > div {
		${({readOnly}) => readOnly? '': 'border-color: #0074D9;'}
	}
`;

const StyledResolutionEditor = styled(ResolutionEditor)<{resnStatus?: ResnStatusType | null}>`
	background-color: ${({resnStatus}) => (resnStatus && resnColor[resnStatus]) || '#fafafa'};
	border: 1px solid #ddd;
	border-radius: 0 5px 5px 5px;
`;

export const ResolutionEdit = ({
	resolution,
	updateResolution,
	readOnly
}: {
	resolution: MultipleCommentResolution;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) =>
	<>
		<Row>
			<AssigneeAndSubmission
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
			<ResolutionApproval
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
		</Row>
		<Row>
			<Col
				style={{
					width: '100%',
					position: 'relative',	// position toolbar
					paddingTop: 15			// make room for toolbar
				}}
			>
				<label>Resolution:</label>
				<StyledResolutionContainer readOnly={readOnly} >
					<StyledResnStatus
						value={resolution.ResnStatus}
						onChange={value => updateResolution({ResnStatus: value})}
						readOnly={readOnly}
					/>
					<StyledResolutionEditor
						value={isMultiple(resolution.Resolution)? '': resolution.Resolution}
						onChange={value => updateResolution({Resolution: value})}
						placeholder={isMultiple(resolution.Resolution)? MULTIPLE_STR: BLANK_STR}
						resnStatus={isMultiple(resolution.ResnStatus)? null: resolution.ResnStatus}
						readOnly={readOnly}
					/>
				</StyledResolutionContainer>
			</Col>
		</Row>
	</>

export default ResolutionEdit;
