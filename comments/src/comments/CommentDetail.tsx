import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import {
	ActionButton, Row,
	shallowDiff, recursivelyDiffObjects, debounce, Multiple, ConfirmModal
} from 'dot11-components';

import CommentHistory from './CommentHistory';
import CommentEdit from './CommentEdit';
import ResolutionEdit from './ResolutionEdit';
import EditingEdit from './EditingEdit';

import type { RootState } from '../store';
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	updateComments,
	setUiProperties,
	selectCommentsState,
	selectCommentsAccess,
	getCID,
	CommentResolution,
	Comment,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
} from '../store/comments';
import { selectGroupEntities } from '../store/groups';
import { AccessLevel, selectUser } from '../store/user';

function renderAccess(access: number) {
	if (access === AccessLevel.admin)
		return "admin";
	if (access === AccessLevel.rw)
		return "rw";
	if (access === AccessLevel.ro)
		return "ro";
	return "none";
}

export type MultipleCommentResolution = Multiple<CommentResolution>;
export type MultipleComment = Multiple<Comment>;
export type MultipleResolution = Multiple<Resolution>;

type CommentDetailState = {
	savedResolution: MultipleCommentResolution,
	editedResolution: MultipleCommentResolution,
	comments: CommentResolution[];
	commentsAccess: number;
	resolutionsAccess: number;
}

class CommentDetail extends React.PureComponent<CommentDetailProps, CommentDetailState> {
	constructor(props: CommentDetailProps) {
		super(props)
		this.state = this.initState();
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	/* User has read-write comments access if the user is an officer of the assigned ad-hoc */
	getCommentsAccess = (access: number, comments: CommentResolution[]) => {
		const {groupEntities} = this.props;
		if (access <= AccessLevel.ro) {
			const rw = comments.every(c => {
				const group = c.AdHocGroupId? groupEntities[c.AdHocGroupId]: undefined;
				if (group) {
					const access = group.permissions.comments || AccessLevel.none;
					if (access >= AccessLevel.rw)
						return true;
				}
				return false;
			});
			if (rw)
				return AccessLevel.rw;
		}
		return access;
	}

	/* User has read-write resolutions access if the user has been assigned the comment
	 * and the comment does not have an approved resolution. */
	getResolutionsAccess = (access: number, comments: CommentResolution[]) => {
		const {user} = this.props;
		if (access <= AccessLevel.ro &&
			comments.every(c => c.AssigneeSAPIN === user.SAPIN && !c.ApprovedByMotion)) {
				access = AccessLevel.rw;
		}
		return access;
	}

	initState = (): CommentDetailState => {
		const {entities, selected, access} = this.props;
		let diff = {}, comments: CommentResolution[] = [];
		selected.forEach(id => {
			const comment = entities[id];
			if (comment) {
				diff = recursivelyDiffObjects(diff, comment);
				comments.push(comment);
			}
		});
		let commentsAccess = this.getCommentsAccess(access, comments);
		let resolutionsAccess = this.getResolutionsAccess(commentsAccess, comments);
		return {
			savedResolution: diff as MultipleCommentResolution,
			editedResolution: diff as MultipleCommentResolution,
			comments,
			commentsAccess,
			resolutionsAccess
		};
	}

	updateResolution = (changes: Partial<CommentResolution>) => {
		if (this.state.resolutionsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
			console.warn("Insufficient access to update resolution");
			return;
		}
		// merge in the edits and trigger save
		this.setState(
			(state) => ({...state, editedResolution: {...state.editedResolution, ...changes}}),
			this.triggerSave
		);
	}

	save = () => {
		const {savedResolution, editedResolution, comments} = this.state;
		const {updateComments, updateResolutions, addResolutions} = this.props;

		/* Find changes */
		const commentChanges: Partial<Comment> = {},
			  resolutionChanges: Partial<Resolution> = {};
		const d = shallowDiff(savedResolution, editedResolution) as Partial<CommentResolution>;
		for (let k in d) {
			//if (k === 'AdHocGroupId' || k === 'AdHoc' || k === 'CommentGroup' || k === 'Notes' || k === 'Page' || k === 'Clause')
			if (k in ['AdHocGroupId', 'AdHoc', 'CommentGroup', 'Notes', 'Page', 'Clause'])
				commentChanges[k] = d[k];
			else
				resolutionChanges[k] = d[k];
		}
		if (Object.keys(commentChanges).length > 0) {
			const updates = comments.map(c => ({id: c.comment_id, changes: commentChanges}));
			updateComments(updates);
		}
		if (Object.keys(resolutionChanges).length > 0) {
			const updates: ResolutionUpdate[] = [];
			const adds: ResolutionCreate[] = [];
			for (const c of comments) {
				if (c.resolution_id)
					updates.push({id: c.resolution_id, changes: resolutionChanges});
				else
					adds.push({comment_id: c.comment_id, ...resolutionChanges});
			}
			if (updates.length > 0)
				updateResolutions(updates);
			if (adds.length > 0)
				addResolutions(adds);
		}
		this.setState((state) => ({...state, savedResolution: editedResolution}));
	}

	handleAddResolutions = async () => {
		if (this.state.commentsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
		const {addResolutions} = this.props;
		const {comments} = this.state;
		//console.log(comments)

		if (comments.find(c => c.ApprovedByMotion)) {
			const msg = comments.length > 1?
				"One of the comments has an approved resolution.":
				"The comment has an approved resolution.";
			const ok = await ConfirmModal.show(msg + " Are you sure you want to add another resolution?");
			if (!ok)
				return;
		}

		// Add only one entry per comment_id
		const resolutions: ResolutionCreate[] = [];
		for (const c of comments) {
			if (!resolutions.find(r => r.comment_id === c.comment_id))
				resolutions.push({comment_id: c.comment_id});
		}
		this.triggerSave.flush();
		await addResolutions(resolutions);
	}

 	handleDeleteResolutions = async () => {
 		if (this.state.commentsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
		const {deleteResolutions} = this.props;
		const {comments} = this.state;
 		const ids = comments
 			.filter(c => c.resolution_id)	// only those with resolutions
 			.map(c => c.id);
 		this.triggerSave.flush();
 		await deleteResolutions(ids);
		this.setState(this.initState());
 	}

 	toggleUiProperty = (property: string) => this.props.setUiProperties({[property]: !this.props.uiProperties[property]});

	render() {
		const {loading, uiProperties, readOnly} = this.props;
		const {comments, editedResolution, commentsAccess, resolutionsAccess} = this.state;

		let notAvailableStr: string | undefined;
		if (loading)
			notAvailableStr = 'Loading...';
		else if (comments.length === 0)
			notAvailableStr = 'Nothing selected';

		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string
		const disableEditButtons = disableButtons || readOnly || !uiProperties.editComment;

		const actionElements =
			<>
				<CommentHistory />
				{!readOnly && (commentsAccess >= AccessLevel.rw || resolutionsAccess >= AccessLevel.rw) &&
					<ActionButton
						name='edit'
						title='Edit resolution'
						disabled={disableButtons}
						isActive={uiProperties.editComment}
						onClick={() => this.toggleUiProperty('editComment')}
					/>}
				{!readOnly && commentsAccess >= AccessLevel.rw &&
					<>
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
			</>

		const bodyElement =
			notAvailableStr?
				<div className="placeholder">
					<span>{notAvailableStr}</span>
				</div>:
				<>
					<CommentEdit 
						cids={comments.map(getCID)}
						comment={editedResolution}
						updateComment={this.updateResolution}
						showNotes={uiProperties.showNotes}
						toggleShowNotes={() => this.toggleUiProperty('showNotes')}
						readOnly={readOnly || commentsAccess < AccessLevel.rw || !uiProperties.editComment}
					/>
					{editedResolution.ResolutionID !== null &&
						<>
							<ResolutionEdit
								resolution={editedResolution}
								updateResolution={this.updateResolution}
								readOnly={readOnly || resolutionsAccess < AccessLevel.rw || !uiProperties.editComment}
								commentsAccess={commentsAccess}
							/>
							<EditingEdit
								resolution={editedResolution}
								updateResolution={this.updateResolution}
								showEditing={uiProperties.showEditing}
								toggleShowEditing={() => this.toggleUiProperty('showEditing')}
								readOnly={readOnly || commentsAccess < AccessLevel.rw || !uiProperties.editComment}
							/>
						</>}
					<Row style={{justifyContent: 'flex-end', opacity: 0.5}}>
						{`${renderAccess(commentsAccess)} / ${renderAccess(resolutionsAccess)}`}
					</Row>
				</>

		return(
			<>
				<div className="top-row">{actionElements}</div>
				<div className="main">{bodyElement}</div>
			</>
		);
	}
}

type PropsIn = {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
}

const connector = connect(
	(state: RootState, props: PropsIn) => {
		const user = selectUser(state);
		const {entities, loading, selected, ui: uiProperties} = selectCommentsState(state);
		const groupEntities = selectGroupEntities(state);
		let access = selectCommentsAccess(state);
		return {
			entities,
			loading,
			selected,
			uiProperties,
			access,
			user,
			groupEntities
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

type CommentDetailProps = ConnectedProps<typeof connector> & PropsIn;

export default connector(CommentDetail);
