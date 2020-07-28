import PropTypes from 'prop-types'
import React from 'react'
import {ActionButton} from '../general/Icons'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

const wrapperCss = css`
	display: inline-block;
	user-select: none;
	position: relative;`

const containerCss = css`
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

const listCss = css`
	margin-block-start: 0;
	margin-block-end: 0;
	padding-inline-start: 5px;`

const listItemCss = css`
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

function ColumnSelector(props) {
	const [isOpen, setOpen] = React.useState(false)
	const {list, isStacked, toggleColumns} = props

	React.useEffect(() => {
		if (isOpen) {
			window.addEventListener('click', close)
		}
		else{
			window.removeEventListener('click', close)
		}

		return () => {
			window.removeEventListener('click', close)
		}
	}, [isOpen])

	function radioChange(e) {
		if ((!isStacked && e.target.name === 'stacked') ||
			(isStacked && e.target.name === 'flat')) {
			toggleColumns()
		}
	}

	function close() {
		setOpen(false)
	}

	return (
		<div css={wrapperCss}>
			<ActionButton name='columns' title='Select Columns' onClick={() => setOpen(!isOpen)} />
			{isOpen &&
				<div css={containerCss}>
					<label><input type='radio' name='stacked' checked={isStacked} onChange={radioChange} />Stacked</label>
					<label><input type='radio' name='flat' checked={!isStacked} onChange={radioChange} />Flat</label>
					<hr />
					<ul css={listCss}>
						{list.map((item, index) => (
							<li css={listItemCss} key={item.dataKey} onClick={() => props.toggleItem(item.dataKey)}>
								{props.isChecked(item.dataKey) && '\u2714'} {item.label} 
							</li>
						))}
					</ul>
				</div>
			}
		</div>
	)
}
ColumnSelector.propTypes = {
	list: PropTypes.array.isRequired,
	isStacked: PropTypes.bool.isRequired,
	toggleColumns: PropTypes.func.isRequired,
	isChecked: PropTypes.func.isRequired,
	toggleItem: PropTypes.func.isRequired
}

export default ColumnSelector
