import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';

import {
	ActionButton, Row, Col, List, ListItem, Field, FieldLeft, Checkbox, Input,
	Icon, IconCollapse,
	AccessLevel, shallowDiff, recursivelyDiffObjects, debounce, isMultiple, Multiple, MULTIPLE
} from 'dot11-components';

import AdHocSelector from './AdHocSelector';
import CommentGroupSelector from './CommentGroupSelector';
import AssigneeSelector from './AssigneeSelector';
import SubmissionSelector from './SubmissionSelector';
import {ResolutionEditor} from './ResolutionEditor';
import CommentHistory from './CommentHistory';

import type { RootState } from '../store';
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	updateComments,
	setUiProperties,
	selectCommentsState,
	getCID,
	getCommentStatus,
	CommentResolution,
	Resolution,
	ResnStatusType,
	ResolutionUpdate,
	ResolutionCreate
} from '../store/comments';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const MultipleContainer = styled.span`
	color: GrayText;
	font-style: italic;
`;

const ShowMultiple = (props) => <MultipleContainer {...props}>{MULTIPLE_STR}</MultipleContainer>

const renderCommenter = (comment: MultipleCommentResolution) => {
	const commenter = comment.CommenterName
	if (isMultiple(commenter)) {
		return <ShowMultiple />
	}
	let vote, mbs
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

const renderPage = (page) => {
	if (isMultiple(page))
		return <ShowMultiple />
	return typeof page === 'number'? page.toFixed(2): page;
}

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
	resolution,
	setResolution,
	showNotes,
	toggleShowNotes,
	readOnly
}: {
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<CommentResolution>) => void;
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
						value={isMultiple(resolution.AdHoc)? '': resolution.AdHoc || ''}
						onChange={value => setResolution({AdHoc: value})}
						placeholder={isMultiple(resolution.AdHoc)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Col>
			<Col>
				<Field label='Comment group:'>
					<CommentGroupSelector
						style={{flexBasis: 300}}
						value={isMultiple(resolution.CommentGroup)? '': resolution.CommentGroup || ''}
						onChange={value => setResolution({CommentGroup: value})}
						placeholder={isMultiple(resolution.CommentGroup)? MULTIPLE_STR: BLANK_STR}
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
					<StyledResolutionEditor
						value={isMultiple(resolution.Notes)? '': resolution.Notes}
						onChange={value => setResolution({Notes: value})}
						placeholder={isMultiple(resolution.Notes)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				}
			</Col>
		</Row>
	</>

const Column1 = ({
	style,
	className,
	resolution,
	setResolution,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<Resolution>) => void;
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
					onChange={({SAPIN, Name}) => setResolution({AssigneeSAPIN: SAPIN, AssigneeName: Name})}
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
					onChange={value => setResolution({Submission: value})}
					placeholder={isMultiple(resolution.Submission)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
	</Col>

function Column2({
	style,
	className,
	resolution,
	setResolution,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {

	const changeApproved = (e) => {
 		let value;
 		if (e.target.name === 'Approved') {
	 		if (e.target.checked) {
				value = new Date()
				value = value.toDateString()
			}
			else {
				value = '';
			}
		}
		else {
			value = e.target.value
		}
		setResolution({ApprovedByMotion: value})
	}

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
						onChange={e => setResolution({ReadyForMotion: e.target.checked})}
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
						size={6}
						name='ApprovedByMotion'
						value={isMultiple(resolution.ApprovedByMotion)? '': resolution.ApprovedByMotion || ''}
						onChange={changeApproved}
						placeholder={isMultiple(resolution.ApprovedByMotion)? MULTIPLE_STR: ''}
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
	onChange: (value: ResnStatusType) => void;
	readOnly?: boolean;
}) {
	const handleChange = e => onChange(e.target.checked? e.target.value: '');

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

const EditContainer = styled.div`
	background-color: #fafafa;
	border: 1px solid #ddd;
	border-radius: 0 5px 5px 5px;
`;

const ResolutionEdit = ({
	resolution,
	setResolution,
	showEditing,
	toggleShowEditing,
	readOnly
}: {
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<Resolution>) => void;
	showEditing: boolean;
	toggleShowEditing?: () => void;
	readOnly?: boolean;
}) =>
	<>
		<Row>
			<Column1
				resolution={resolution}
				setResolution={setResolution}
				readOnly={readOnly}
			/>
			<Column2
				resolution={resolution}
				setResolution={setResolution}
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
						onChange={value => setResolution({ResnStatus: value})}
						readOnly={readOnly}
					/>
					<StyledResolutionEditor
						value={isMultiple(resolution.Resolution)? '': resolution.Resolution}
						onChange={value => setResolution({Resolution: value})}
						placeholder={isMultiple(resolution.Resolution)? MULTIPLE_STR: BLANK_STR}
						resnStatus={isMultiple(resolution.ResnStatus)? null: resolution.ResnStatus}
						readOnly={readOnly}
					/>
				</StyledResolutionContainer>
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
					<label>Editing:</label>
					{toggleShowEditing && <IconCollapse isCollapsed={!showEditing} onClick={toggleShowEditing} />}
				</div>
				{showEditing &&
					<EditContainer>
						<EditStatus
							resolution={resolution}
							setResolution={setResolution}
							readOnly={readOnly}
						/>
						<ResolutionEditor
							value={isMultiple(resolution.EditNotes)? '': resolution.EditNotes}
							onChange={value => setResolution({EditNotes: value})}
							placeholder={isMultiple(resolution.EditNotes)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly}
						/>
					</EditContainer>
				}
			</Col>
		</Row>
	</>

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

const StyledResolutionEditor = styled(ResolutionEditor)<{resnStatus?: ResnStatusType | null}>`
	background-color: ${({resnStatus}) => (resnStatus && resnColor[resnStatus]) || '#fafafa'};
	border: 1px solid #ddd;
	border-radius: 0 5px 5px 5px;
`;

const StyledResolutionContainer = styled(Col)<{readOnly?: boolean}>`
	:hover > div {
		${({readOnly}) => readOnly? '': 'border-color: #0074D9;'}
	}
`;

function EditStatus({
	resolution,
	setResolution,
	readOnly
}: {
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
}) {

	const changeEditStatus = (e) => {
 		let fields: Partial<Resolution> = {}
 		if (e.target.name === 'EditStatus') {
	 		if (e.target.checked) {
				fields.EditStatus = e.target.value
				if (e.target.value === 'I') {
					fields.EditInDraft = '1.0'
				}
				else {
					fields.EditInDraft = ''
				}
			}
			else {
				fields.EditStatus = ''
				if (e.target.value === 'I') {
					fields.EditInDraft = ''
				}
			}
		}
		else {
			fields.EditInDraft = e.target.value
			if (e.target.value) {
				fields.EditStatus = 'I'
			}
		}
		setResolution(fields)
	};

	const editInDraft = isMultiple(resolution.EditInDraft)? '': resolution.EditInDraft
	const placeholder = isMultiple(resolution.EditInDraft)? MULTIPLE_STR: undefined

	return (
		<List onClick={e => e.stopPropagation()}>
			<ListItem>
				<Checkbox
					name='EditStatus'
					value='I'
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === 'I'}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>Implemented in draft:</label>
				<Input
					type='number'
					style={{width: 80}}
					pattern='^\d*(\.\d{0,2})?$'
					step='0.1'
					name='EditInDraft'
					value={editInDraft || ''}
					onChange={changeEditStatus}
					placeholder={placeholder}
					disabled={readOnly}
				/>
			</ListItem>
			<ListItem>
				<Checkbox
					name='EditStatus'
					value='N'
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === 'N'}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>No Change</label>
			</ListItem>
		</List>
	)
}

const CommentContainer = styled.div`
	label {
		font-weight: bold;
	}
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

export function Comment({
	cids,
	resolution,
	setResolution,
	showNotes,
	toggleShowNotes,
	showEditing,
	toggleShowEditing,
	readOnly
}: {
	cids: string[];
	resolution: MultipleCommentResolution;
	setResolution: (changes: Partial<CommentResolution>) => void;
	showNotes: boolean;
	toggleShowNotes?: () => void;
	showEditing: boolean;
	toggleShowEditing?: () => void;
	readOnly?: boolean;
}) {
	const comment = resolution;
	const cidsStr = cids.join(', ');
	const cidsLabel = cids.length > 1? 'CIDs:': 'CID:';

	return (
		<CommentContainer>
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
						comment={resolution}
						setComment={setResolution}
						readOnly={readOnly}
					/>
				</FieldLeft>
				<FieldLeft label='Clause:'>
					<CommentClause
						comment={resolution}
						setComment={setResolution}
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
				resolution={resolution}
				setResolution={setResolution}
				showNotes={showNotes}
				toggleShowNotes={toggleShowNotes}
				readOnly={readOnly}
			/>
			{resolution.ResolutionID !== null &&
				<ResolutionEdit
					resolution={resolution}
					setResolution={setResolution}
					showEditing={showEditing}
					toggleShowEditing={toggleShowEditing}
					readOnly={readOnly}
				/>
			}
		</CommentContainer>
	)
}

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

const DetailContainer = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
`;

type MultipleCommentResolution = Multiple<CommentResolution>;

type CommentDetailState = {
	savedResolution: MultipleCommentResolution,
	editedResolution: MultipleCommentResolution,
	comments: CommentResolution[];
}
class CommentDetail extends React.PureComponent<CommentDetailProps, CommentDetailState> {
	constructor(props: CommentDetailProps) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
		this.readOnly = this.props.readOnly || this.props.access < AccessLevel.SubgroupAdmin;
	}

	triggerSave: ReturnType<typeof debounce>;
	readOnly: boolean;

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: CommentDetailProps): CommentDetailState => {
		const {entities, selected} = props;
		let diff = {}, originalComments: CommentResolution[] = [];
		for (const cid of selected) {
			const comment = entities[cid];
			if (comment) {
				diff = recursivelyDiffObjects(diff, comment);
				originalComments.push(comment);
			}
		}
		return {
			savedResolution: diff as MultipleCommentResolution,
			editedResolution: diff as MultipleCommentResolution,
			comments: originalComments
		};
	}

	doResolutionUpdate = (fields) => {
		if (this.readOnly || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			(state, props) => ({...state, editedResolution: {...state.editedResolution, ...fields}}),
			this.triggerSave
		);
	}

	save = () => {
		const {editedResolution, comments} = this.state;
		const {updateComments, updateResolutions, addResolutions} = this.props;

		/* Find changes */
		const commentUpdate: Partial<Comment> = {}, resolutionUpdate: Partial<Resolution> = {};
		const d = shallowDiff(this.state.savedResolution, editedResolution);
		for (let k in d) {
			if (k === 'AdHoc' || k === 'CommentGroup' || k === 'Notes' || k === 'Page' || k === 'Clause')
				commentUpdate[k] = d[k];
			else
				resolutionUpdate[k] = d[k];
		}
		if (Object.keys(commentUpdate).length > 0) {
			const updates = comments.map(c => ({id: c.comment_id, changes: commentUpdate}));
			updateComments(updates);
		}
		if (Object.keys(resolutionUpdate).length > 0) {
			const updates: ResolutionUpdate[] = [];
			const adds: ResolutionCreate[] = [];
			for (const c of comments) {
				if (c.resolution_id) {
					updates.push({id: c.resolution_id, changes: resolutionUpdate});
				}
				else {
					adds.push({comment_id: c.comment_id, ...resolutionUpdate});
				}
			}
			if (updates.length > 0)
				updateResolutions(updates);
			if (adds.length > 0)
				addResolutions(adds);
		}
		this.setState((state, props) => ({...state, savedResolution: editedResolution}));
	}

	handleAddResolutions = async () => {
		if (this.readOnly || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
		const {comments} = this.state;
		const {addResolutions} = this.props;
		//console.log(comments)
		const resolutions: ResolutionCreate[] = [];
		// Add only one entry per CommentID
		for (const comment_id of comments.map(c => c.comment_id)) {
			if (!resolutions.find(r => r.comment_id === comment_id))
				resolutions.push({comment_id});
		}
		this.triggerSave.flush();
		await addResolutions(resolutions);
	}

 	handleDeleteResolutions = async () => {
 		if (this.readOnly || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
 		const ids = this.state.comments
 			.filter(c => c.ResolutionCount > 0)	// only those with resolutions
 			.map(c => c.resolution_id);
 		this.triggerSave.flush();
 		await this.props.deleteResolutions(ids);
 	}

 	toggleUiProperty = (property: string) => this.props.setUiProperties({[property]: !this.props.uiProperties[property]});

	render() {
		const {style, className, loading, uiProperties} = this.props;
		const {comments, editedResolution} = this.state;

		let notAvailableStr: string | undefined;
		if (loading)
			notAvailableStr = 'Loading...';
		else if (comments.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string
		const disableEditButtons = disableButtons || this.readOnly || !uiProperties.editComment;

		return(
			<DetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					{!this.readOnly && <>
						<CommentHistory />
						<ActionButton
							name='edit'
							title='Edit resolution'
							disabled={disableButtons}
							isActive={uiProperties.editComment}
							onClick={() => this.toggleUiProperty('editComment')}
						/>
						<ActionButton
							name='add'
							title='Create alternate resolution'
							disabled={disableEditButtons}
							onClick={this.handleAddResolutions}
						/>
						<ActionButton
							name='delete'
							title='Delete resolution'
							disabled={disableEditButtons}
							onClick={this.handleDeleteResolutions}
						/>
					</>}
				</TopRow>
				
				{notAvailableStr?
					<NotAvaialble>
						<span>{notAvailableStr}</span>
				 	</NotAvaialble>:
					<Comment 
						cids={comments.map(getCID)}
						resolution={editedResolution}
						setResolution={this.doResolutionUpdate}
						showNotes={uiProperties.showNotes}
						toggleShowNotes={() => this.toggleUiProperty('showNotes')}
						showEditing={uiProperties.showEditing}
						toggleShowEditing={() => this.toggleUiProperty('showEditing')}
						readOnly={this.readOnly || !uiProperties.editComment}
					/>
				}
			</DetailContainer>
		)
	}
}

const connector = connect(
	(state: RootState) => {
		const data = selectCommentsState(state);
		return {
			entities: data.entities,
			loading: data.loading,
			selected: data.selected,
			uiProperties: data.ui,
		}
	},
	{
		addResolutions,
		deleteResolutions,
		updateResolutions,
		updateComments,
		setUiProperties,
	}
);

type CommentDetailProps = ConnectedProps<typeof connector> & {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
	access: number;
};

export default connector(CommentDetail);

export {renderCommenter, renderPage, renderTextBlock}