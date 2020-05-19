import React from 'react'
import {connect} from 'react-redux'
import {ColumnSearchFilter, ColumnDropdownFilter} from '../general/AppTable'
import {setCommentsFilter, removeCommentsFilter, genCommentsOptions} from '../actions/comments'
import {Handle} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

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
		justify-content: space-between;
	`
	return <div css={rowCss} {...props} />
}

function Col(props) {
	const colCss = css`
		display: flex;
		flex-direction: column;
		margin: 5px;
	`
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
				<label>{label}</label>
				<ColumnDropdownFilter {...otherProps} />
			</Col>
		)
	}
)
const CommentsSearchFilter = connect(commentsFilterStateMap, commentsFilterDispatchMap)(
	({label, ...otherProps}) => {
		return (
			<Col onClick={e => e.stopPropagation()}>
				<label>{label}</label>
				<ColumnSearchFilter {...otherProps} />
			</Col>
		)
	}
)

function ActiveFilter(props) {
	const componentCss = css`
		display: flex;
		flex-direction: row;
		border: 1px solid #fff;
		border-radius: 2px;
		padding: 0 5px;
		margin: 3px 0 3px 5px;
		background: #0074d9;
		color: #fff;
		:hover {
			opacity: 0.9;
		}`
	const itemCss = css`color: #fff;`
	const closeCss = css`
		width: 22px;
		height: 22px;
		text-align: center;
		margin: 0 -5px 0 0;
		border-radius: 0 3px 3px 0;
		cursor: pointer;
		:hover {color: tomato}`
	return (
		<span css={componentCss} role='listitem' direction='ltr' color='#0074d9' onClick={e => e.stopPropagation()} >
			<span css={itemCss}>{props.children}</span>
			<span css={closeCss} onClick={props.remove}>×</span>
		</span>
	)
}

function _ShowFilters(props) {
	let elements = []
	for (let dataKey of Object.keys(props.filters)) {
		let f = props.filters[dataKey]
		const options = props.options[dataKey]
		if (f.valid && f.values.length) {
			elements.push(<label key={dataKey} >{commentFieldLabel(dataKey) + ': '}</label>)
			if (Array.isArray(f.values)) {
				for (let v of f.values) {
					const o = options.find(o => o.value === v)
					if (o) {
						elements.push(<ActiveFilter key={`${dataKey}_${o.value}`} remove={() => props.removeFilter(dataKey, o.value)}>{o.label}</ActiveFilter>)
					}
				}
			}
			else {
				const s = f.values
				elements.push(<ActiveFilter key={`${dataKey}_${s}`} remove={() => props.setFilter(dataKey, '')}>{s}</ActiveFilter>)
			}
		}
	}
	if (elements.length === 0) {
		elements.push('None')
	}

	return elements
}

function showFiltersStateMap(state, ownProps) {
	return {
		filters: state.comments.filters,
		options: state.comments.options
	}
}
function showFiltersDispatchMap(dispatch, ownProps) {
	return {
		setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
		removeFilter: (dataKey, value) => dispatch(removeCommentsFilter(dataKey, value))
	}
}
const ShowFilters = connect(showFiltersStateMap, showFiltersDispatchMap)(_ShowFilters)

function ChangeFilters(props) {

	return (
		<React.Fragment>
			<Row>
				<Col>
					<Row>
						<CommentsDropdownFilter dataKey='CommenterName' width={200} />
						<CommentsDropdownFilter dataKey='Vote' width={150} />
						<CommentsDropdownFilter dataKey='MustSatisfy' />
					</Row>
					<Row>
						<CommentsSearchFilter dataKey='Page' />
						<CommentsSearchFilter dataKey='Clause' />
						<CommentsDropdownFilter dataKey='Category' />
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
		</React.Fragment>
	)
}

function Filters(props) {
	const [open, setOpen] = React.useState(false)

	const filtersCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		cursor: pointer;
		border: 1px solid #ddd;
		background-color: white;
		min-height: 36px;
		min-width: 100px;
		align-items: center;
		:hover {
			border-color: #0074D9;
		}
	`
	return (
		<ClickOutside css={filtersCss} onClick={() => setOpen(!open)} onClickOutside={() => setOpen(false)}>
			{open? <ChangeFilters />: <ShowFilters />}
			<Handle open={open} onClick={() => setOpen(!open)} />
		</ClickOutside>
	)
}

function CommentsFilters(props) {

	const commentsFiltersCss = css`
		display: flex;
		flex-direction: row;
		align-items: center;
		label {
			font-weight: bold;
		}
		label, span {
			margin: 3px 0 3px 5px;
		}
	`
	return (
		<div css={commentsFiltersCss}>
			<Col>
				<label>Filters:</label>
				<span>{`Showing ${props.shownRows} of ${props.totalRows}`}</span>
			</Col>
			<Filters />
		</div>
	)
}

function mapStateToProps(state) {
	const {comments} = state
	return {
		totalRows: comments.comments.length,
		shownRows: comments.commentsMap.length
	}
}
export default connect(mapStateToProps)(CommentsFilters)