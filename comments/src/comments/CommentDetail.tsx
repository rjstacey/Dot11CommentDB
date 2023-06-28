import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';

import {
	ActionButton,
	shallowDiff, recursivelyDiffObjects, debounce, Multiple
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
	getCID,
	CommentResolution,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
	Comment,
	selectCommentsAccess
} from '../store/comments';
import { selectGroupEntities } from '../store/groups';
import { AccessLevel, selectUser } from '../store/user';

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

const CommentContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

export type MultipleCommentResolution = Multiple<CommentResolution>;

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
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentWillUnmount() {
		this.triggerSave.flush();
	}

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

	getResolutionsAccess = (access: number, comments: CommentResolution[]) => {
		const {user} = this.props;
		if (access <= AccessLevel.ro) {
			const rw = comments.every(c => c.AssigneeSAPIN === user.SAPIN);
			if (rw)
				access = AccessLevel.rw;
		}
		return access;
	}

	initState = (props: CommentDetailProps): CommentDetailState => {
		const {entities, selected} = props;
		let diff = {}, originalComments: CommentResolution[] = [];
		selected.forEach(id => {
			const comment = entities[id];
			if (comment) {
				diff = recursivelyDiffObjects(diff, comment);
				originalComments.push(comment);
			}
		});
		let access = this.props.access;
		let commentsAccess = this.getCommentsAccess(access, originalComments);
		let resolutionsAccess = this.getResolutionsAccess(commentsAccess, originalComments);
		return {
			savedResolution: diff as MultipleCommentResolution,
			editedResolution: diff as MultipleCommentResolution,
			comments: originalComments,
			commentsAccess,
			resolutionsAccess
		};
	}

	updateResolution = (changes: Partial<CommentResolution>) => {
		if (this.state.resolutionsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
			console.warn("Update in read only component");
			return;
		}
		// merge in the edits and trigger save
		this.setState(
			(state) => ({...state, editedResolution: {...state.editedResolution, ...changes}}),
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
			if (k === 'AdHocGroupId' || k === 'AdHoc' || k === 'CommentGroup' || k === 'Notes' || k === 'Page' || k === 'Clause')
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
		this.setState((state) => ({...state, savedResolution: editedResolution}));
	}

	handleAddResolutions = async () => {
		if (this.state.commentsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
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
 		if (this.state.commentsAccess < AccessLevel.rw || !this.props.uiProperties.editComment) {
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
		const {style, className, loading, uiProperties, readOnly} = this.props;
		const {comments, editedResolution, commentsAccess, resolutionsAccess} = this.state;

		let notAvailableStr: string | undefined;
		if (loading)
			notAvailableStr = 'Loading...';
		else if (comments.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string
		const disableEditButtons = disableButtons || readOnly || !uiProperties.editComment;

		return(
			<DetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					{`${this.props.access} ${commentsAccess} ${resolutionsAccess}`}
					{!readOnly && <>
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
					<CommentContainer>
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
								/>
								<EditingEdit
									resolution={editedResolution}
									updateResolution={this.updateResolution}
									showEditing={uiProperties.showEditing}
									toggleShowEditing={() => this.toggleUiProperty('showEditing')}
									readOnly={readOnly || commentsAccess < AccessLevel.rw || !uiProperties.editComment}
								/>
							</>}
					</CommentContainer>
				}
			</DetailContainer>
		)
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
