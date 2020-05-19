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
//import styles from '../css/Icons.css'

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
export function Handle(props) {
	const handleCss = css`
		cursor: pointer;
		text-align: center;
		margin: 0;
		width: 22px;
		height: 22px;
	`
	const {open, ...otherProps} = props
	return (
		<div css={[handleCss, !open && {transform: 'rotate(180deg)'}]} {...otherProps}>
			<svg fill="currentColor" viewBox="0 0 40 40">
				<path d="M31 26.4q0 .3-.2.5l-1.1 1.2q-.3.2-.6.2t-.5-.2l-8.7-8.8-8.8 8.8q-.2.2-.5.2t-.5-.2l-1.2-1.2q-.2-.2-.2-.5t.2-.5l10.4-10.4q.3-.2.6-.2t.5.2l10.4 10.4q.2.2.2.5z" />
			</svg>
		</div>
	)
}
