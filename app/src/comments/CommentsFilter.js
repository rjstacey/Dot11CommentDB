import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import Select from 'react-dropdown-select'
import {CommentIdFilter} from './CommentIdList'
import {ColumnSearchFilter, ColumnDropdown} from '../table/AppTable'
import ShowFilters from '../table/ShowFilters'

import {setCommentsFilter, removeCommentsFilter, clearCommentsFilters, genCommentsOptions, setCommentsSort} from '../store/comments'


const commentFieldLabel = dataKey => ({
	CommenterName: 'Commenter',
	MustSatisfy: 'Must Satisfy',
	Category: 'Cat',
	Page: 'Page',
	ProposedChange: 'Proposed Change',
	CommentGroup: 'Comment Group',
	AssigneeName: 'Assignee',
	Status: 'Status',
	ApprovedByMotion: 'Motion Number',
	ResnStatus: 'Resn Status',
	Resolution: 'Resolution',
	EditStatus: 'Editing Status',
	EditInDraft: 'In Draft',
	EditNotes: 'Editing Notes'
}[dataKey] || dataKey);

const SearchInput = styled.input`
	margin: 10px 10px 0;
	line-height: 30px;
	padding: 0px 20px;
	border: 1px solid #ccc;
	border-radius: 3px;
	:focus {
		outline: none;
		border: 1px solid deepskyblue;
	}
`;

const StyledSelect = styled(Select)`
	background-color: white;
	border: 1px solid #ddd;
	padding: 0;
	box-sizing: border-box;
	.react-dropdown-select-dropdown {
		overflow: initial;
		max-height: unset;
		width: unset;
	}
`;


function commentsFilterStateMap(state, ownProps) {
	const {dataKey} = ownProps
	return {
		label: commentFieldLabel(dataKey),
		filter: state.comments.filters[dataKey],
		sort: state.comments.sort,
		options: state.comments.filters[dataKey].options
	}
}

function commentsFilterDispatchMap(dispatch, ownProps) {
	const {dataKey} = ownProps
	return {
		setFilter: (value) => dispatch(setCommentsFilter(dataKey, value)),
		setSort: (dataKey, direction) => dispatch(setCommentsSort(dataKey, direction)),
		genOptions: (all) => dispatch(genCommentsOptions(dataKey, all))
	}
}

export const CommentsColumnDropdown = connect(commentsFilterStateMap, commentsFilterDispatchMap)(ColumnDropdown)

const ActiveFilterLabel = styled.label`
	font-weight: bold;
	line-height: 22px;
	margin: 3px;
`;

const ActiveFilterContainer = styled.div`
	display: flex;
	flex-direction: row;
	height: 22px;
	margin: 3px 3px 3px 0;
	background: #0074d9;
	color: #fff;
	align-items: center;
	:hover {opacity: 0.9}
`;

const ActiveFilterItem = styled.span`
	color: #fff;
	line-height: 21px;
	padding: 0 0 0 5px;
`;

const ActiveFilterClose = styled.span`
	cursor: pointer;
	width: 22px;
	text-align: center;
	:after {content: "×"}
	:hover {color: tomato}
`;

function ActiveFilter({children, remove}) {
	return (
		<ActiveFilterContainer role='listitem' direction='ltr'>
			{children && <ActiveFilterItem>{children}</ActiveFilterItem>}
			<ActiveFilterClose onClick={remove} />
		</ActiveFilterContainer>
	)
}

function renderActiveFilters({filters, setFilter, removeFilter, clearFilters, options}) {
	let elements = []
	for (let dataKey of Object.keys(filters)) {
		let f = filters[dataKey]
		if (f.valid && f.values.length) {
			elements.push(<ActiveFilterLabel key={dataKey}>{commentFieldLabel(dataKey) + ': '}</ActiveFilterLabel>)
			if (Array.isArray(f.values)) {
				for (let v of f.values) {
					const o = options[dataKey].find(o => o.value === v)
					const s = o? o.label: v
					elements.push(<ActiveFilter key={`${dataKey}_${v}`} remove={() => removeFilter(dataKey, v)}>{s}</ActiveFilter>)
				}
			}
			else {
				const s = f.values
				elements.push(<ActiveFilter key={`${dataKey}_${s}`} remove={() => setFilter(dataKey, '')}>{s}</ActiveFilter>)
			}
		}
	}
	if (elements.length > 2) {
		elements.push(<ActiveFilterLabel>Clear All:</ActiveFilterLabel>)
		elements.push(<ActiveFilter key={'clear_all'} remove={clearFilters} />)
	}
	return elements
}

const FiltersContainer = styled.div`
	display: flex;
	flex-direction: row;
`;

const FiltersLabel = styled.div`
	flex: content;
	margin: 5px;
	& label {
		font-weight: bold;
	}
`;

const FiltersPlaceholder = styled.span`
	color: #ccc;
	margin-left: 5px;
`;

const FiltersContent = styled.div`
	flex: 1;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-content: flex-start;
	border: solid 1px #ccc;
	border-radius: 3px;
`;


const CommentsFilters = (props) => <ShowFilters {...props} />

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
			data: comments.comments,
			dataMap: comments.commentsMap,
			filters: state.comments.filters
		}
	},
	(dispatch, ownProps) => {
		return {
			setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
			removeFilter: (dataKey, value) => dispatch(removeCommentsFilter(dataKey, value)),
			clearFilters: () => dispatch(clearCommentsFilters())
		}
	}
)(CommentsFilters)
