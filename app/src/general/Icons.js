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

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

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

const iconCss = css`
	display: inline-block;
	width: 16px;
	height: 16px;
	background-position: center center;
	background-repeat: no-repeat;`

export function IconClose(props) { return <FontAwesomeIcon icon='window-close' {...props} /> }

export function IconSort({direction, isAlpha, ...props}) {
	let icon = 'sort-' +
		(isAlpha? 'alpha-': 'numeric-') +
		(direction === 'ASC'? 'down': 'up')
	return <FontAwesomeIcon icon={icon} {...props} />
}

export function ButtonGroup(props) {
	const buttonGroupCss = css`
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
	const {children, ...otherProps} = props
	return <div css={buttonGroupCss} {...otherProps}>{children}</div>
}

export function ActionButton(props) {
	const buttonCss = css`
		display: inline-block;
		margin: 0 5px 0 0;
		/*padding: 3px 8px;*/
		/*height: 30px; */
		/*line-height: 22px;*/
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

	const buttonActiveCss = css`background: none #d8d8d8;`

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

	let {name, isActive, ...otherProps} = props
	return (
		<button
			css={[buttonCss, isActive && buttonActiveCss]}
			{...otherProps}
		>
			<FontAwesomeIcon css={iconCss} icon={mapName[name] || name} />
		</button>
	)
}

/*
 * <Handle
 *	open = {true|false} indicates that the window is open or closed
 *  onClick = func to call on with user click; toggles open and close
 * />
 */
export function Handle({open, ...otherProps}) {
	const handleCss = css`
		cursor: pointer;
		text-align: center;
		margin: 0;
		width: 22px;
		height: 22px;
		:hover {color: tomato}`
	return (
		<div css={[handleCss, !open && {transform: 'rotate(180deg)'}]} {...otherProps}>
			<svg fill="none" viewBox="0 0 40 40">
				{/*<path d="M31 26.4q0 .3-.2.5l-1.1 1.2q-.3.2-.6.2t-.5-.2l-8.7-8.8-8.8 8.8q-.2.2-.5.2t-.5-.2l-1.2-1.2q-.2-.2-.2-.5t.2-.5l10.4-10.4q.3-.2.6-.2t.5.2l10.4 10.4q.2.2.2.5z" />*/}
				<path d="M 10 25 L 20 15 L 30 25" stroke="currentColor" strokeWidth="3" />
			</svg>
		</div>
	)
}

export function Cross(props) {
	const crossCss = css`
		cursor: pointer;
		text-align: center;
		margin: 0;
		width: 22px;
		height: 22px;
		:hover {color: tomato}`
	return (
		<div css={crossCss} {...props}>
			<svg fill="currentColor" viewBox="0 0 40 40">
				<path d="M 10 10 L 30 30 M 10 30 L 30 10" stroke="currentColor" strokeWidth="4" />
			</svg>
		</div>
	)
}

export function Expander({open, ...otherProps}) {
	const expanderCss = css`
		cursor: pointer;
		width: 22px;
		height: 22px;
		:hover {color: tomato}`
	return (
		<div css={[expanderCss, open && {transform: 'rotate(90deg)'}]} {...otherProps}>
			<svg fill="currentColor" viewBox="0 0 40 40">
				<path d="M 10 10 L 10 30 L 20 20 Z" stroke="currentColor" strokeWidth="4" />
			</svg>
		</div>
	)
}

export function DoubleExpander({open, ...otherProps}) {
	const expanderCss = css`
		cursor: pointer;
		width: 22px;
		height: 22px;
		:hover {color: tomato}`
	return (
		<div css={[expanderCss, open && {transform: 'rotate(90deg)'}]} {...otherProps}>
			<svg fill="currentColor" viewBox="0 0 40 40">
				<path d="M 10 10 L 10 30 L 20 20 Z M 20 10 L 20 30 L 30 20 Z" stroke="currentColor" strokeWidth="4" />
			</svg>
		</div>
	)
}

export function Checkbox({indeterminate, ...otherProps}) {
	const checkboxCss = css`
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
	return <input type='checkbox' css={checkboxCss} ref={el => el && (el.indeterminate = indeterminate)} {...otherProps}/>
}
