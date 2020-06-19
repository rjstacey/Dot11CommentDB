import React from 'react'
import {connect} from 'react-redux'
import {ColumnSearchFilter, ColumnDropdownFilter} from '../general/AppTable'
import {setCommentsFilter, removeCommentsFilter, clearCommentsFilters, genCommentsOptions} from '../actions/comments'
import {Handle, Cross} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'
import {CommentIdFilter} from './CommentIdList'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

const labelCss = css`
	font-weight: bold;
	margin: 3px 5px 3px 5px;`

const commentFieldLabel = (dataKey) => {

	const fieldLabels = {
		CommenterName: 'Commenter',
		MustSatisfy: 'Must Satisfy',
		Category: 'Cat',
		Page: 'Page',
		ProposedChange: 'Proposed Change',
		CommentGroup: 'Comment Group',
		AssigneeName: 'Assignee',
		ResnStatus: 'Resn Status',
		Resolution: 'Resolution',
		EditStatus: 'Editing Status',
		EditInDraft: 'In Draft',
		EditNotes: 'Editing Notes'
	}
	let label = fieldLabels[dataKey]
	if (!label) {
		label = dataKey
	}
	return label
}

function Row(props) {
	const rowCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;`
	return <div css={rowCss} {...props} />
}

function Col(props) {
	const colCss = css`
		display: flex;
		flex-direction: column;
		margin: 5px;`
	return <div css={colCss} {...props} />
}


function commentsFilterStateMap(state, ownProps) {
	const {dataKey} = ownProps
	return {
		filter: state.comments.filters[dataKey],
		options: state.comments.options[dataKey],
		label: commentFieldLabel(dataKey)
	}
}

function commentsFilterDispatchMap(dispatch, ownProps) {
	const {dataKey} = ownProps
	return {
		setFilter: (value) => dispatch(setCommentsFilter(dataKey, value)),
		genOptions: () => dispatch(genCommentsOptions(dataKey))
	}
}

const CommentsDropdownFilter = connect(commentsFilterStateMap, commentsFilterDispatchMap)(
	({label, ...otherProps}) => {
		return (
			<Col onClick={e => e.stopPropagation()}>
				<label css={labelCss}>{label}</label>
				<ColumnDropdownFilter {...otherProps} />
			</Col>
		)
	}
)

const CommentsSearchFilter = connect(commentsFilterStateMap, commentsFilterDispatchMap)(
	({label, ...otherProps}) => {
		return (
			<Col onClick={e => e.stopPropagation()}>
				<label css={labelCss}>{label}</label>
				<ColumnSearchFilter {...otherProps} />
			</Col>
		)
	}
)

function ActiveFilter({children, remove}) {
	const componentCss = css`
		display: flex;
		flex-direction: row;
		border: 1px solid #fff;
		border-radius: 2px;
		padding: 0 5px;
		margin: 3px 0 3px 5px;
		background: #0074d9;
		color: #fff;
		:hover {opacity: 0.9}`
	const itemCss = css`
		color: #fff;
		line-height: 21px`
	const closeCss = css`
		cursor: pointer;
		width: 22px;
		height: 22px;
		text-align: center;
		margin: 0 -5px 0 0;
		border-radius: 0 3px 3px 0;
		:hover {color: tomato}`
	return (
		<span css={componentCss} role='listitem' direction='ltr' onClick={e => e.stopPropagation()} >
			<span css={itemCss}>{children}</span>
			<span css={closeCss} onClick={remove}>×</span>
		</span>
	)
}

function _ShowFilters({filters, setFilter, removeFilter, options}) {

	let children = []
	for (let dataKey of Object.keys(filters)) {
		let f = filters[dataKey]
		if (f.valid && f.values.length) {
			children.push(<label key={dataKey} css={labelCss}>{commentFieldLabel(dataKey) + ': '}</label>)
			if (Array.isArray(f.values)) {
				for (let v of f.values) {
					const o = options[dataKey].find(o => o.value === v)
					const s = o? o.label: v
					children.push(<ActiveFilter key={`${dataKey}_${v}`} remove={() => removeFilter(dataKey, v)}>{s}</ActiveFilter>)
				}
			}
			else {
				const s = f.values
				children.push(<ActiveFilter key={`${dataKey}_${s}`} remove={() => setFilter(dataKey, '')}>{s}</ActiveFilter>)
			}
		}
	}

	if (children.length === 0) {
		const placeholderCss = css`
			color: #ccc;
			margin-left: 5px;
			font-size: smaller`
		children.push(<span key='nothing' css={placeholderCss}>Select...</span>)
	}

	const showFiltersCss = css`
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		max-height: 120px;
		overflow: hidden;`
	return <div css={showFiltersCss}>{children}</div>
}

const ShowFilters = connect(
	(state, ownProps) => {
		return {
			filters: state.comments.filters,
			options: state.comments.options
		}
	},
	(dispatch, ownProps) => {
		return {
			setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
			removeFilter: (dataKey, value) => dispatch(removeCommentsFilter(dataKey, value))
		}
	}
)(_ShowFilters)

function ChangeFilters(props) {

	return (
		<Col onClick={e => e.stopPropagation()} >
			<Row>
				<label css={labelCss}>CID</label>
				<CommentIdFilter />
			</Row>
			<Row>
				<Col>
					<Row>
						<CommentsSearchFilter dataKey='Clause' width={100} />
						<CommentsSearchFilter dataKey='Page' width={80} />
						<CommentsDropdownFilter dataKey='Category' />
						<CommentsDropdownFilter dataKey='MustSatisfy' />
					</Row>
					<Row>
						<CommentsDropdownFilter dataKey='CommenterName' width={200} />
						<CommentsDropdownFilter dataKey='Vote' width={100} />
					</Row>

				</Col>
				<Col>
					<CommentsSearchFilter dataKey='Comment' />
					<CommentsSearchFilter dataKey='ProposedChange' />
				</Col>
				<Col>
					<CommentsDropdownFilter dataKey='CommentGroup' />
					<CommentsDropdownFilter dataKey='AssigneeName' />
				</Col>
				<Col>
					<Row>
						<CommentsDropdownFilter dataKey='Submission' />
						<CommentsDropdownFilter dataKey='ResnStatus' />
					</Row>
					<CommentsSearchFilter dataKey='Resolution' />
				</Col>
				<Col>
					<Row>
						<CommentsDropdownFilter dataKey='EditStatus' width={70} />
						<CommentsDropdownFilter dataKey='EditInDraft' width={80} />
					</Row>
					<CommentsSearchFilter dataKey='EditNotes' />
				</Col>
			</Row>
		</Col>
	)
}

function CommentsFilters({totalRows, shownRows, clearFilters, hasFilter, ...otherProps}) {
	const [open, setOpen] = React.useState(false)

	const containerCss = css`
		display: flex;
		flex-direction: row;
		align-items: center;`
		
	const filtersCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		cursor: pointer;
		border: 1px solid #ccc;
		border-radius: 2px;
		background-color: white;
		min-height: 36px;
		align-items: center;
		:hover {border-color: #0074D9}`

	return (
		<div css={containerCss} {...otherProps} >
			<Col>
				<label css={labelCss}>Filters:</label>
				<span>{`Showing ${shownRows} of ${totalRows}`}</span>
			</Col>
			<ClickOutside css={filtersCss} onClick={() => setOpen(!open)} onClickOutside={() => setOpen(false)} >
				{open? <ChangeFilters />: <ShowFilters />}
				{hasFilter() && <Cross title="Clear All" onClick={e => {clearFilters(); e.stopPropagation()}} />}
				<Handle title={open? "Close": "Open"} open={open} onClick={(e) => {setOpen(!open);e.stopPropagation()}} />
			</ClickOutside>
		</div>
	)
}

/* Run through the filters and see if at least one is set */
function hasFilter(filters) {
	for (let dataKey in filters) {
		const filter = filters[dataKey]
		if (Array.isArray(filter.values)) {
			if (filter.values.length) {
				return true
			}
		}
		else {
			if (filter.values) {
				return true
			}
		}
	}
	return false
}

export default connect(
	(state, ownProps) => {
		const {comments} = state
		return {
			totalRows: comments.comments.length,
			shownRows: comments.commentsMap.length,
			hasFilter: () => hasFilter(comments.filters)
		}
	},
	(dispatch, ownProps) => {
		return {
			clearFilters: () => dispatch(clearCommentsFilters())
		}
	}
)(CommentsFilters)