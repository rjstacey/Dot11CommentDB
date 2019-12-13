import React from 'react'
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import what we use
import { faUpload, faDownload,
	faHighlighter, faBold, faItalic, faStrikethrough, faUnderline,
	faUndo, faRedo,
	faQuoteRight, faListUl, faListOl, faCode,
	faSync, faPlus, faTrashAlt, 
	faSortAlphaDown, faSortAlphaUp, faSortNumericDown, faSortNumericUp,
	faWindowClose, faAngleDoubleDown,
	faAngleDown, faAngleUp,
} from '@fortawesome/free-solid-svg-icons';
//import { faCode, faHighlighter } from '@fortawesome/free-regular-svg-icons';

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
	);
}

export function IconImport(props) { return <FontAwesomeIcon icon='download' {...props} /> }
export function IconExport(props) { return <FontAwesomeIcon icon='upload' {...props} /> }

export function IconDelete(props) { return <FontAwesomeIcon icon='trash-alt' {...props} /> }
export function IconRefresh(props) { return <FontAwesomeIcon icon='sync' {...props} /> }
export function IconAdd(props) { return <FontAwesomeIcon icon='plus' {...props} /> }

export function IconClose(props) { return <FontAwesomeIcon icon='window-close' {...props} /> }
export function IconMore(props) { return <FontAwesomeIcon icon='angle-double-down' {...props} /> }

export function IconAngleDown(props) { return <FontAwesomeIcon icon='angle-down' {...props} /> }
export function IconAngleUp(props) { return <FontAwesomeIcon icon='angle-up' {...props} /> }

/* Used in the resolution editor */
export function EditorToolIcon({icon, ...props}) {
	const map = {
		'highlight': 'highlighter',
		'quote': 'quote-right',
		'unordered-list-item': 'list-ul',
		'ordered-list-item': 'list-ol',
	}
	icon = map[icon]? map[icon]: icon;
	return <FontAwesomeIcon icon={icon} {...props} />
}

export function IconSort({direction, isAlpha, ...props}) {
	var icon = 'sort-'
	icon += true? 'alpha-': 'numeric-'
	icon += direction === 'ASC'? 'down': 'up'
	return <FontAwesomeIcon icon={icon} {...props} />
}
