import React from 'react'
import {library} from '@fortawesome/fontawesome-svg-core'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
// import what we use
import {
	faUpload, faDownload,
	faHighlighter, faBold, faItalic, faStrikethrough, faUnderline,
	faUndo, faRedo,
	faQuoteRight, faListUl, faListOl, faCode,
	faSync, faPlus, faTrashAlt, 
	faSortAlphaDown, faSortAlphaUp, faSortNumericDown, faSortNumericUp,
	faWindowClose, faAngleDoubleDown,
	faAngleDown, faAngleUp,
	faArrowCircleRight, faArrowCircleLeft, faArrowCircleUp, faArrowCircleDown,
	faFileExport,
	faColumns,
	faSave,
	faObjectGroup, faUserCheck, faEdit
} from '@fortawesome/free-solid-svg-icons'
//import { faCode, faHighlighter } from '@fortawesome/free-regular-svg-icons';

import styled from '@emotion/styled'


export function init() {
	library.add(
		faUpload, faDownload,
		faQuoteRight, faListUl, faListOl, faCode,
		faBold, faItalic, faUnderline, faStrikethrough, faHighlighter, 
		faUndo, faRedo,
		faSync, faPlus, faTrashAlt,
		faSortAlphaDown, faSortAlphaUp, faSortNumericDown, faSortNumericUp,
		faWindowClose, faAngleDoubleDown,
		faAngleDown, faAngleUp,
		faArrowCircleRight, faArrowCircleLeft, faArrowCircleUp, faArrowCircleDown,
		faFileExport,
		faColumns,
		faSave,
		faObjectGroup, faUserCheck, faEdit
	)
}

export function IconClose(props) { return <FontAwesomeIcon icon='window-close' {...props} /> }

export function IconSort({direction, isAlpha, ...props}) {
	let icon = 'sort-' +
		(isAlpha? 'alpha-': 'numeric-') +
		(direction === 'ASC'? 'down': 'up')
	return <FontAwesomeIcon icon={icon} {...props} />
}

export const ButtonGroup = styled.div`
	display: inline-block;
	margin: 0 5px 0 0;
	padding: 3px 8px;
	height: 30px;
	line-height: 22px;
	box-sizing: border-box;
	background: none #fdfdfd;
	background: linear-gradient(to bottom, #fdfdfd 0%,#f6f7f8 100%);
	border: 1px solid #999;
	border-radius: 2px;
	color: #333;
	text-decoration: none;
	font-size: inherit;
	font-family: inherit;
	cursor: pointer;
	white-space: nowrap;

	:disabled {
		cursor: not-allowed;
		background: none transparent;
	}

	:disabled > * {
		opacity: .5;
	}
`

export const ActionButton = ({name, isActive, ...otherProps}) => {
	const Button = styled.button`
		display: inline-block;
		margin: 0 5px 0 0;
		padding: 3px;
		box-sizing: border-box;
		background: none #fdfdfd;
		background: linear-gradient(to bottom, #fdfdfd 0%,#f6f7f8 100%);
		border: 1px solid #999;
		border-radius: 2px;
		color: #333;
		text-decoration: none;
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		:disabled {
			cursor: not-allowed;
			background: none transparent;
		}
		:disabled > * {
			opacity: .5;
		}
	`

	const mapName = {
		'refresh': 'sync',
		'add': 'plus',
		'delete': 'trash-alt',
		'next': 'arrow-circle-right',
		'prev': 'arrow-circle-left',
		'import': 'download',
		'upload': 'upload',
		'more': 'angle-double-down',
		'export': 'file-export',
		'columns': 'columns',
		'save': 'save',
		'undo': 'undo',
		'close': 'window-close',
		'group': 'object-group',
		'assignment': 'user-check',
		'edit': 'edit',
		'highlight': 'highlighter',
		'quote': 'quote-right',
		'unordered-list-item': 'list-ul',
		'ordered-list-item': 'list-ol',
	}

	return (
		<Button style={isActive? {background: 'none #d8d8d8'}: {}} {...otherProps}>
			<FontAwesomeIcon icon={mapName[name] || name} />
		</Button>
	)
}

const IconContainer = styled.div`
	cursor: pointer;
	width: 22px;
	height: 22px;
	:hover {
		color: tomato
	}`

/** <Handle
 *	  open = {true|false} indicates that the window is open or closed
 *  />
 */
export const Handle = ({open, ...otherProps}) => {
	return (
		<IconContainer {...otherProps}>
			<svg style={!open? {transform: 'rotate(180deg)'}: {}} fill="none" viewBox="0 0 40 40">
				<path d="M 10 25 L 20 15 L 30 25" stroke="currentColor" strokeWidth="3" />
			</svg>
		</IconContainer>
	)
}

export const Cross = (props) => {
	return (
		<IconContainer {...props}>
			<svg fill="currentColor" viewBox="0 0 40 40">
				<path d="M 10 10 L 30 30 M 10 30 L 30 10" stroke="currentColor" strokeWidth="4" />
			</svg>
		</IconContainer>
	)
}

export const Expander = ({open, ...otherProps}) => (
	<IconContainer {...otherProps}>
		<svg style={open? {transform: 'rotate(90deg)'}: {}} fill="currentColor" viewBox="0 0 40 40">
			<path d="M 10 10 L 10 30 L 20 20 Z" stroke="currentColor" strokeWidth="4" />
		</svg>
	</IconContainer>
)

export const DoubleExpander = ({open, ...otherProps}) => (
	<IconContainer {...otherProps}>
		<svg style={open? {transform: 'rotate(90deg)'}: {}} fill="currentColor" viewBox="0 0 40 40">
			<path d="M 10 10 L 10 30 L 20 20 Z M 20 10 L 20 30 L 30 20 Z" stroke="currentColor" strokeWidth="4" />
		</svg>
	</IconContainer>
)

const Input = styled.input`
	cursor: inherit;
	-webkit-appearance: none;
	background-color: #fafafa;
	border: 1px solid #cacece;
	/*box-shadow: 0 1px 2px rgba(0,0,0,0.05), inset 0px -15px 10px -12px rgba(0,0,0,0.05);*/
	padding: 6px;
	/*border-radius: 3px;*/
	display: inline-block;
	position: relative;
	width: 12px;
	height: 12px;
	:checked {
		background-color: #e9ecee;
		border: 1px solid #adb8c0;
	}
	:indeterminate {
		background-color: #e9ecee;
		border: 1px solid #adb8c0;
	}
	:checked:after {
		content: '\\2714';
		font-size: 10px;
		font-weight: 700;
		position: absolute;
		top: -1px;
		left: 1px;
	}
	:indeterminate:after {
		content: "";
		position: absolute;
		top: 1px;
		left: 1px;
		border: 5px solid #5f6061;
	}
	:focus {
		outline: none;
	}`;

export function Checkbox({indeterminate, ...otherProps}) {
	return <Input type='checkbox' ref={el => el && (el.indeterminate = indeterminate)} {...otherProps}/>
}

export function Search(props) {
	return <Input type='search' {...props} />
}
