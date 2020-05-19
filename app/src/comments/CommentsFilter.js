import React from 'react'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {setCommentsFilter, genCommentsFilter} from '../actions/comments'
import ContentEditable from '../general/ContentEditable'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function Row(props) {
	const rowStyle = css`
		display: flex;
		flex-direction: row;
		width: 100%;
	`
	return <div css={rowStyle} {...props} />
}

function Col(props) {
	const colStyle = css`
		display: flex;
		flex-direction: column;
		margin: 10px;
	`
	return <div css={colStyle} {...props} />
}

function DropdownFilter({filter, setFilter, genFilter, optionsMap, width}) {

	const elementCss = css`
		background-color: white;
		border: 1px solid #ddd;
		padding: 0;
		box-sizing: border-box;
		width: ${width? width + 'px': 'unset'};

		.react-dropdown-select-clear,
		.react-dropdown-select-dropdown-handle {
			margin: 0;
	 	}
		.react-dropdown-select-option {
			border: 1px solid #fff;
		}
		.react-dropdown-select-input {
			/*color: #fff;*/
		}
		.react-dropdown-select-content {

		}
		.react-dropdown-select-dropdown {
			position: absolute;
			left: 0;
			border: 1px solid #ddd;
			padding: 0;
			display: flex;
			flex-direction: column;
			border-radius: 2px;
			max-height: 300px;
			overflow: auto;
			z-index: 9;
			box-shadow: none;
		}
		.react-dropdown-select-item {
			:hover {
			   background-color: #efefef;
			}
		}
		.react-dropdown-select-item.react-dropdown-select-item-selected,
		.react-dropdown-select-item.react-dropdown-select-item-active {
			color: inherit;
			font-weight: bold;
			background: #ddd;
		}
		.react-dropdown-select-item.react-dropdown-select-item-disabled {
			background: #777;
			color: #ccc;
		}
	`

	const onChange = (values) => {
		setFilter(values.map(v => v.value))
	}

	const options = filter.options.map(o => ({value: o, label: optionsMap? optionsMap(o): o}))
	const values = Array.isArray(filter.filtStr)?
		filter.filtStr.map(o => ({value: o, label: optionsMap? optionsMap(o): o})):
		[]
	return (
		<Select
			css={elementCss}
			placeholder=""
			values={values}
			onChange={onChange}
			multi
			closeOnSelect
			onDropdownOpen={() => genFilter()}
			options={options}
			//disabled={options.length === 0}
			//labelField='label'
			//valueField='value'
			//contentRenderer={contentRenderer}
		/>
    )
}


function SearchFilter({dataKey, filter, setFilter, width}) {

	if (!filter) {
		return null
	}

	const elementCss = css`
		background-color: #ffffff;
		border: 1px solid #ddd;
		padding: 0;
		box-sizing: border-box;
		width: ${width? width + 'px': 'unset'};
		min-height: 36px;
		background-color: ${filter.valid? 'white': 'red'};
		:placeholder-shown {
			background: right center no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28' %3E%3Cpath fill-opacity='.2' d='m 0,0 7.5,11.25 0,7.5 2.5,3.75 0,-11.25 7.5,-11.25 Z'%3E%3C/path%3E%3C/svg%3E");
			background-color: white;
		}
	`

	return (
		<input
			css={elementCss}
			type='search'
			//placeholder=' '//'Filter'
			onChange={e => setFilter(e.target.value)}
			value={filter.filtStr}
		/>
	)
}

function commentsFilterStateMap(state, ownProps) {
	const {dataKey} = ownProps
	return {
		filter: state.comments.filters[dataKey]
	}
}
function commentsFilterDispatchMap(dispatch, ownProps) {
	const {dataKey} = ownProps
	return {
		setFilter: (value) => dispatch(setCommentsFilter(dataKey, value)),
		genFilter: () => dispatch(genCommentsFilter(dataKey))
	}
}
const CommentsDropdownFilter = connect(commentsFilterStateMap, commentsFilterDispatchMap)(DropdownFilter)
const CommentsSearchFilter = connect(commentsFilterStateMap, commentsFilterDispatchMap)(SearchFilter)

function ActiveFilter(props) {
	const cssComponent = css`
		display: flex;
		flex-direction: row;
		border: 1px solid #fff;
		border-radius: 2px;
		padding: 0 5px;
		margin: 3px 0 3px 5px;
		background: #0074d9;
		color: #fff`
	const cssItem = css`color: #fff;`
	const cssClose = css`
		width: 22px;
		height: 22px;
		text-align: center;
		margin: 0 -5px 0 0;
		border-radius: 0 3px 3px 0;
		:hover {color: tomato}`
	return (
		<span css={cssComponent} role='listitem' direction='ltr' color='#0074d9'>
			<span css={cssItem}>{props.children}</span>
			<span css={cssClose} onClick={props.remove}>x</span>
		</span>
	)
}

function _ActiveFilters(props) {
	let elements = []
	for (let dataKey of Object.keys(props.filters)) {
		let f = props.filters[dataKey]
		if (f.valid && f.filtStr) {
			const filtStrArr = Array.isArray(f.filtStr)? f.filtStr: [f.filtStr]
			elements.push(<label>{dataKey + ': '}</label>)
			elements = elements.concat(filtStrArr.map(s => (<ActiveFilter remove={() => props.setFilter(dataKey, '')}>{s}</ActiveFilter>)))
		}
	}
	return elements
}
function activeFiltersStateMap(state, ownProps) {
	return {
		filters: state.comments
	}
}
function activeFiltersDispatchMap(dispatch, ownProps) {
	return {
		setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value))
	}
}
const ActiveFilters = connect(activeFiltersStateMap, activeFiltersDispatchMap)(_ActiveFilters)


function _CIDs(props) {
	const [list, setList] = React.useState('')
	const listRef = React.useRef(null)

	function cidValid(cid) {
		return props.comments.filter(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid).length > 0
	}

	function changeList(e) {
		const listArr = listRef.current.innerText.match(/\d+\.\d+[^\d]*|\d+[^\d]*/g)
		if (listArr) {
			var list = ''
			listArr.forEach(cidStr => {
				const m = cidStr.match(/(\d+\.\d+|\d+)(.*)/)		// split number from separator
				const cid = m[1]
				const sep = m[2]
				//console.log(m)
				if (cidValid(cid)) {
					list += cid + sep
				}
				else {
					list += '<span style="color: red">' + cid + '</span>' + sep
				}
			})
			setList(list)
		}
	}

	function selectShown() {
		const {comments, commentsMap} = props
		const list = commentsMap.map(i => comments[i].CID).join(', ')
		setList(list)
	}

	function clear() {
		setList('')
	}

	const contentBox = css`
		max-height: 20vh;
		border: 1px solid #888;
		overflow-x: hidden;
		overflow-y: auto;
		padding: 4px 16px 4px 4px;
	`

	return (
		<Row>
			<label>CIDs:</label>
			<ContentEditable
				css={contentBox}
				ref={listRef}
				value={list}
				onInput={changeList}
			/>
			<button onClick={selectShown}>Select filtered</button>
			<button onClick={clear}>Clear</button>
		</Row>
	)
}
const CIDs = connect((state) => {
	const {comments} = state
	return {
		comments: comments.comments,
		commentsMap: comments.commentsMap
	}
})(_CIDs)

function CommentsFiltersChange(props) {

	const msOptionsMap = (value) => (value? 'Yes': 'No')
	const basicOptionsMap = (value) => (value? value: '<blank>')

	return (
		<React.Fragment>
			<Row>
				<Col>
					<Row>
						<Col>
							<label>Commenter</label>
							<CommentsDropdownFilter dataKey='CommenterName' width={200} />
						</Col>
						<Col>
							<label>Vote</label>
							<CommentsDropdownFilter dataKey='Vote' width={150} />
						</Col>
						<Col>
							<label>Must Satisfy</label>
							<CommentsDropdownFilter dataKey='MustSatisfy' optionsMap={msOptionsMap} />
						</Col>
					</Row>
					<Row>
						<Col>
							<label>Page</label>
							<CommentsSearchFilter dataKey='Page' />
						</Col>
						<Col>
							<label>Clause</label>
							<CommentsSearchFilter dataKey='Clause' />
						</Col>
						<Col>
							<label>Category</label>
							<CommentsDropdownFilter dataKey='Category' />
						</Col>
					</Row>
				</Col>
				<Col>
					<Row>
						<Col>
							<label>Comment</label>
							<CommentsSearchFilter dataKey='Comment' />
						</Col>
					</Row>
					<Row>
						<Col>
							<label>Proposed Change</label>
							<CommentsSearchFilter dataKey='ProposedChange' />
						</Col>
					</Row>
				</Col>
				<Col>
					<label>Comment group</label>
					<CommentsDropdownFilter dataKey='CommentGroup' optionsMap={basicOptionsMap} />
					<label>Assignee</label>
					<CommentsDropdownFilter dataKey='AssigneeName' optionsMap={basicOptionsMap} />
					<label>Submission</label>
					<CommentsDropdownFilter dataKey='Submission' optionsMap={basicOptionsMap} />
				</Col>
				<Col>
					<label>Resn status</label>
					<CommentsDropdownFilter dataKey='ResnStatus' />
					<label>Resolution</label>
					<CommentsSearchFilter dataKey='Resolution' />
				</Col>
				<Col>
					<label>Editing status</label>
					<CommentsDropdownFilter dataKey='EditStatus' width={70} />
					<label>Edit in draft</label>
					<CommentsDropdownFilter dataKey='EditInDraft' width={80} />
					<label>Edit notes</label>
					<CommentsSearchFilter dataKey='EditNotes' />
				</Col>
			</Row>
		</React.Fragment>
	)
}

function CommentsFilters(props) {
	const [showChange, setShowChange] = React.useState(false)

	const labelCss = css`
		label {
			font-weight: bold;
		}
	`
	if (showChange) {
		return (
			<Col css={labelCss}>
				<label>{props.shownRows} of {props.totalRows} comment</label>
				<CommentsFiltersChange key='af_0'/>
				<button key='af_1' onClick={() => setShowChange(false)}>Close</button>
			</Col>
		)
	}
	else {
		return (
			<Row css={labelCss}>
				<label>{props.shownRows} of {props.totalRows} comments</label>
				<label key='af_2'>Active filters:</label><ActiveFilters />
				<button key='af_3' onClick={() => setShowChange(true)}>Open</button>
			</Row>
		)
	}
}

function mapStateToProps(state) {
	const {comments} = state
	return {
		commentsValid: comments.commentsValid,
		totalRows: comments.comments.length,
		shownRows: comments.commentsMap.length
	}
}
export default connect(mapStateToProps)(CommentsFilters)