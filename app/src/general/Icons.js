import React from 'react'
import cx from 'classnames'
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
import styles from '../css/Icons.css'

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
export function IconUp(props) { return <FontAwesomeIcon icon='arrow-circle-up' className={styles.icon} {...props} /> }
export function IconDown(props) { return <FontAwesomeIcon icon='arrow-circle-down' className={styles.icon} {...props} /> }

export function IconSort({direction, isAlpha, ...props}) {
	var icon = 'sort-'
	icon += true? 'alpha-': 'numeric-'
	icon += direction === 'ASC'? 'down': 'up'
	return <FontAwesomeIcon icon={icon} {...props} />
}

export function ButtonGroup(props) {
	const {children, ...otherProps} = props;
	return <div className={styles.buttonGroup} {...otherProps}>{children}</div>
}

export function ActionButton(props) {
	let {className, name, isActive, ...otherProps} = props;
	className = cx(className, {
		[styles.button]: true,
		[styles.isActive]: isActive,
	})
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
		<button
			className={className}
			{...otherProps}
		>
			<FontAwesomeIcon className={styles.icon} icon={mapName[name] || name} />
		</button>
	);
}
