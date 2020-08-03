import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {ActionButton, Checkbox} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'

const Wrapper = styled(ClickOutside)`
	display: inline-block;
	user-select: none;
	position: relative;`

const PullDown = styled.div`
	z-index: 10;
	position: absolute;
	right: 0;
	width: 222px;
	border: 2px solid #dfdfdf;
	/*border-top: none;*/
	border-bottom-right-radius: 3px;
	border-bottom-left-radius: 3px;
	background-color: #fff;
	box-shadow: 0 2px 5px -1px #e8e8e8;
	max-height: 300px;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;`

const PullDownList = styled.ul`
	margin-block-start: 0;
	margin-block-end: 0;
	padding-inline-start: 5px;`

const PullDownListItem = styled.li`
	width: 100%;
	cursor: default;
	display: inline-block;
	white-space: nowrap;
	text-overflow: ellipsis;
	:selected {
		color: #fff;
		background-color: #ffcc01;
	}
	:hover {
		color: #fff;
		background-color: #ffcc01;
	}`

function ColumnSelector({list, isStacked, toggleStacked, isFixed, toggleFixed, isChecked, toggleItem}) {
	const [isOpen, setOpen] = React.useState(false)

	return (
		<Wrapper onClick={() => setOpen(!isOpen)} onClickOutside={() => setOpen(false)}>
			<ActionButton name='columns' title='Select Columns' onClick={() => setOpen(!isOpen)} />
			{isOpen &&
				<PullDown>
					<label><Checkbox name='fixed' checked={isFixed} onChange={toggleFixed} />Scale column width</label>
					<br />
					<label><Checkbox name='stacked' checked={isStacked} onChange={e => {!isStacked && toggleStacked()}} />Stacked</label>
					<label><Checkbox name='flat' checked={!isStacked} onChange={e => {isStacked && toggleStacked()}} />Flat</label>
					<hr />
					<PullDownList>
						{list.map((item, index) => (
							<PullDownListItem key={item.key} onClick={() => toggleItem(item.key)}>
								{isChecked(item.key) && '\u2714'} {item.label} 
							</PullDownListItem>
						))}
					</PullDownList>
				</PullDown>
			}
		</Wrapper>
	)
}

ColumnSelector.propTypes = {
	list: PropTypes.array.isRequired,
	isStacked: PropTypes.bool.isRequired,
	isFixed: PropTypes.bool.isRequired,
	toggleStacked: PropTypes.func.isRequired,
	toggleFixed: PropTypes.func.isRequired,
	isChecked: PropTypes.func.isRequired,
	toggleItem: PropTypes.func.isRequired
}

export default ColumnSelector
