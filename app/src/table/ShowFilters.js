import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'

import {getDataMap} from '../store/selectors/dataMap'
import {removeFilter, clearAllFilters} from '../store/actions/filter'

const ActiveFilterLabel = styled.label`
	font-weight: bold;
	line-height: 22px;
	margin: 3px;
`;

const ActiveFilterContainer = styled.div`
	display: flex;
	flex-direction: row;
	height: 22px;
	max-width: 200px;
	margin: 3px 3px 3px 0;
	background: #0074d9;
	color: #fff;
	border-radius: 3px;
	align-items: center;
	:hover {opacity: 0.9}`

const ActiveFilterItem = styled.span`
	color: #fff;
	line-height: 21px;
	padding: 0 0 0 5px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const ActiveFilterClose = styled.span`
	cursor: pointer;
	text-align: center;
	margin: 0 5px;
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

function renderActiveFilters({filters, removeFilter, clearAllFilters}) {
	let elements = []
	for (let dataKey in filters) {
		let f = filters[dataKey]
		if (f.values.length > 0) {
			elements.push(<ActiveFilterLabel key={dataKey}>{dataKey + ': '}</ActiveFilterLabel>)
			for (let v of f.values) {
				const o = f.options && f.options.find(o => o.value === v.value)
				let s = o? o.label: v.value.toString()
				if (s === '')
					s = '(Blank)'
				elements.push(<ActiveFilter key={`${dataKey}_${v.value}`} remove={() => removeFilter(dataKey, v.value, v.filterType)}>{s}</ActiveFilter>)
			}
		}
	}
	if (elements.length > 2) {
		elements.push(<ActiveFilterLabel key='clear_all_label'>Clear All:</ActiveFilterLabel>)
		elements.push(<ActiveFilter key='clear_all' remove={clearAllFilters} />)
	}
	return elements
}

const FiltersContainer = styled.div`
	display: flex;
	flex-direction: row;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const FiltersLabel = styled.div`
	flex: content;
	margin-right: 5px;
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

function ShowFilters({style, className, data, dataMap, filters, removeFilter, clearAllFilters, ...otherProps}) {

	const shownRows = dataMap.length;
	const totalRows = data.length;

	const activeFilterElements = renderActiveFilters({filters, removeFilter, clearAllFilters})

	return (
		<FiltersContainer
			style={style}
			className={className}
		>
			<FiltersLabel>
				<label>Filters:</label><br/>
				<span>{`Showing ${shownRows} of ${totalRows}`}</span>
			</FiltersLabel>
			<FiltersContent>
				{activeFilterElements.length? activeFilterElements: <FiltersPlaceholder>No filters</FiltersPlaceholder>}
			</FiltersContent>
		</FiltersContainer>
	)
}

ShowFilters.propTypes = {
	data: PropTypes.array.isRequired,
	dataMap: PropTypes.array.isRequired,
	filters: PropTypes.object.isRequired,
	removeFilter: PropTypes.func.isRequired,
	clearAllFilters: PropTypes.func.isRequired
}

export default connect(
	(state, ownProps) => {
		const {dataSet} = ownProps
		return {
			data: state[dataSet][dataSet],
			dataMap: getDataMap(state, dataSet),
			filters: state[dataSet].filters,
		}
	},
	(dispatch, ownProps) => {
		const {dataSet} = ownProps
		return {
			removeFilter: (dataKey, value, filterType) => dispatch(removeFilter(dataSet, dataKey, value, filterType)),
			clearAllFilters: () => dispatch(clearAllFilters(dataSet)),
		}
	}
)(ShowFilters);