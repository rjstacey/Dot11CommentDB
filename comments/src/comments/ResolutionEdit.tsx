import React from 'react';

import {
	Row, Col, List, ListItem, Field, Checkbox, Input,
	isMultiple, MULTIPLE
} from 'dot11-components';

import AssigneeSelector from './AssigneeSelector';
import SubmissionSelector from './SubmissionSelector';
import Editor from "../editor";

import type { MultipleCommentResolution, MultipleResolution } from './CommentDetail';
import type { Resolution, ResnStatusType } from '../store/comments';
import { AccessLevel } from '../store/user';

import styles from "./comments.module.css";

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

export function ResolutionAssignee({
	resolution,
	updateResolution = () => {},
	readOnly
}: {
	resolution: MultipleResolution;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
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
	)
}

export function ResolutionSubmission({
	resolution,
	updateResolution = () => {},
	readOnly
}: {
	resolution: MultipleResolution;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	return (
		<Field label='Submission:'>
			<SubmissionSelector
				style={{flexBasis: 200}}
				value={isMultiple(resolution.Submission)? '': resolution.Submission || ''}
				onChange={value => updateResolution({Submission: value})}
				placeholder={isMultiple(resolution.Submission)? MULTIPLE_STR: BLANK_STR}
				readOnly={readOnly}
			/>
		</Field>
	)
}

export function ResolutionApproval({
	style,
	className,
	resolution,
	updateResolution = () => {},
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	resolution: MultipleResolution;
	updateResolution?: (changes: Partial<Resolution>) => void;
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
			<List label="">
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

function ResnStatus({
	className,
	value,
	onChange,
	readOnly
}: {
	className?: string;
	value: ResnStatusType | null | typeof MULTIPLE;
	onChange: (value: ResnStatusType | null) => void;
	readOnly?: boolean;
}) {
	const handleChange: React.ChangeEventHandler<HTMLInputElement> = e => onChange(e.target.checked? (e.target.value as ResnStatusType): null);
	const backgroundColor = (!isMultiple(value) && resnColor[value || ""]) || "#fafafa";
	return (
		<div
			style={{backgroundColor}}
			className={styles.resolutionStatus + (className? ` ${className}`: "")}
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
		</div>
	)
}

const resnColor: Record<string, string> = {
	'A': '#d3ecd3',
	'V': '#f9ecb9',
	'J': '#f3c0c0'
};

export function ResolutionAndStatus({
	resolution,
	updateResolution = () => {},
	readOnly,
}: {
	resolution: MultipleResolution;
	updateResolution?: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {
	const backgroundColor = (!isMultiple(resolution.ResnStatus) && resnColor[resolution.ResnStatus || ""]) || "#fafafa";
	return (
		<Col
			className={styles.resolutionField}
		>
			<label>Resolution:</label>
			<div 
				className={styles.resolutionContainer + (readOnly? " readonly": "")}
			>
				<ResnStatus
					value={resolution.ResnStatus}
					onChange={value => updateResolution({ResnStatus: value})}
					readOnly={readOnly}
				/>
				<Editor
					className={styles.resolutionEditor}
					style={{backgroundColor, borderRadius: '0 5px 5px 5px'}}
					value={isMultiple(resolution.Resolution)? "": resolution.Resolution || ""}
					onChange={value => updateResolution({Resolution: value})}
					placeholder={isMultiple(resolution.Resolution)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</div>
		</Col>
	)
}

export function ResolutionEdit({
	resolution,
	updateResolution,
	readOnly,
    commentsAccess = AccessLevel.none,
}: {
	resolution: MultipleCommentResolution;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
    commentsAccess?: number;
}) {
	return (
		<>
			<Row>
				<Col>
					<Row>
						<ResolutionAssignee
							resolution={resolution}
							updateResolution={updateResolution}
							readOnly={readOnly}
						/>
					</Row>
					<Row>
						<ResolutionSubmission
							resolution={resolution}
							updateResolution={updateResolution}
							readOnly={readOnly}
						/>
					</Row>
				</Col>
				<ResolutionApproval
					resolution={resolution}
					updateResolution={updateResolution}
					readOnly={readOnly || commentsAccess < AccessLevel.rw}
				/>
			</Row>
			<Row>
				<ResolutionAndStatus
					resolution={resolution}
					updateResolution={updateResolution}
					readOnly={readOnly}
				/>
			</Row>
		</>
	)
}

export default ResolutionEdit;
