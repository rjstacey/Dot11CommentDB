import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'

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
	:hover {opacity: 0.9}`

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
			elements.push(<ActiveFilterLabel key={dataKey}>{dataKey + ': '}</ActiveFilterLabel>)
			if (Array.isArray(f.values)) {
				for (let v of f.values) {
					const o = f.options.find(o => o.value === v)
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

function ShowFilters({style, className, data, dataMap, filters, setFilter, removeFilter, clearFilters, ...otherProps}) {

	const shownRows = dataMap.length;
	const totalRows = data.length;

	const activeFilterElements = renderActiveFilters({filters, setFilter, removeFilter, clearFilters})

	return (
		<FiltersContainer style={style}>
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
	setFilter: PropTypes.func.isRequired,
	removeFilter: PropTypes.func.isRequired,
	clearFilters: PropTypes.func.isRequired
}

export default ShowFilters;