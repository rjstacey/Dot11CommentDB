import React from 'react'
import {library} from '@fortawesome/fontawesome-svg-core'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
// import what we use
import {
	faFileUpload, faDownload,
	faHighlighter, faBold, faItalic, faStrikethrough, faUnderline,
	faUndo, faRedo,
	faQuoteRight, faListUl, faListOl, faCode,
	faSync, faPlus, faTrashAlt, 
	faSortAlphaDown, faSortAlphaUp, faSortNumericDown, faSortNumericUp,
	faFilter,
	faWindowClose, faAngleDoubleDown,
	faAngleDown, faAngleUp, faAngleLeft, faAngleRight,
	faArrowCircleRight, faArrowCircleLeft, faArrowCircleUp, faArrowCircleDown,
	//faPlusSquare, faMinusSquare,
	faFileExport,
	faColumns,
	faSave,
	faObjectGroup, faUserCheck, faEdit,
	faCaretSquareDown, faCaretSquareUp,
	faHistory,
} from '@fortawesome/free-solid-svg-icons'
import { faPlusSquare, faMinusSquare, faCopy } from '@fortawesome/free-regular-svg-icons';

import styled from '@emotion/styled'

export function init() {
	library.add(
		faFileUpload, faDownload,
		faQuoteRight, faListUl, faListOl, faCode,
		faBold, faItalic, faUnderline, faStrikethrough, faHighlighter, 
		faUndo, faRedo,
		faSync, faPlus, faTrashAlt,
		faSortAlphaDown, faSortAlphaUp, faSortNumericDown, faSortNumericUp,
		faFilter,
		faWindowClose, faAngleDoubleDown,
		faAngleDown, faAngleUp, faAngleLeft, faAngleRight,
		faArrowCircleRight, faArrowCircleLeft, faArrowCircleUp, faArrowCircleDown,
		faPlusSquare, faMinusSquare,
		faFileExport,
		faColumns,
		faSave,
		faObjectGroup, faUserCheck, faEdit,
		faCaretSquareDown, faCaretSquareUp,
		faHistory,
		faCopy
	)
}

export const Icon = FontAwesomeIcon;

//export function IconClose(props) { return <FontAwesomeIcon icon='window-close' {...props} /> }

export function IconSort({direction, isAlpha, ...props}) {
	let icon = 'sort-' +
		(isAlpha? 'alpha-': 'numeric-') +
		(direction === 'ASC'? 'down': 'up')
	return <FontAwesomeIcon icon={icon} {...props} />
}

/*export const IconFilter = (props) =>
	<svg width='1em' height='0.875em' role='img' viewBox="0 0 971.986 971.986" {...props} >
		<path fill='currentColor' d="M370.216,459.3c10.2,11.1,15.8,25.6,15.8,40.6v442c0,26.601,32.1,40.101,51.1,21.4l123.3-141.3   c16.5-19.8,25.6-29.601,25.6-49.2V500c0-15,5.7-29.5,15.8-40.601L955.615,75.5c26.5-28.8,6.101-75.5-33.1-75.5h-873   c-39.2,0-59.7,46.6-33.1,75.5L370.216,459.3z"/>
	</svg>*/
export const IconFilter = (props) => <FontAwesomeIcon icon='filter' {...props} />

export const IconCollapse = ({isCollapsed, ...props}) => <FontAwesomeIcon icon={['far', isCollapsed? 'plus-square': 'minus-square']} {...props} />

export const ActionButtonSort = ({direction, isAlpha, ...props}) => {
	let icon = 'sort-' +
		(isAlpha? 'alpha-': 'numeric-') +
		(direction === 'ASC'? 'down': 'up')
	return <ActionButton name={icon} {...props} />
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
`;

export const Button = styled.button`
	display: inline-block;
	margin-right: 5px;
	padding: 3px;
	box-sizing: border-box;
	background: none ${({isActive}) => isActive? '#d8d8d8': '#fdfdfd'};
	/*background: linear-gradient(to bottom, #fdfdfd 0%,#f6f7f8 100%);*/
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
	:focus {
		outline: none;
	}
`;

export const ActionButton = ({name, ...otherProps}) => {

	const icon = {
		'refresh': 'sync',
		'add': 'plus',
		'delete': 'trash-alt',
		'next': 'arrow-circle-right',
		'prev': 'arrow-circle-left',
		'import': 'download',
		'upload': 'file-upload',
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
		'dropdown-open': 'caret-square-down',
		'dropdown-close': 'caret-square-up',
		'history': 'history',
		'copy': ['far', 'copy']
	}[name] || name;

	return (
		<Button {...otherProps}>
			<FontAwesomeIcon icon={icon} />
		</Button>
	)
}

const IconContainer = styled.div`
	cursor: pointer;
	width: 22px;
	height: 22px;
	:hover {
		color: tomato
	}
`;

/** <Handle
 *	  open = {true|false} indicates that the window is open or closed
 *  />
 */
/*export const Handle = ({open, ...otherProps}) => {
	return (
		<IconContainer {...otherProps}>
			<svg style={!open? {transform: 'rotate(180deg)'}: {}} fill="none" viewBox="0 0 40 40">
				<path d="M 10 25 L 20 15 L 30 25" stroke="currentColor" strokeWidth="3" />
			</svg>
		</IconContainer>
	)
}*/

export const Handle = styled.span`
    display: inline-block;
    width: 0;
    height: 0;
    vertical-align: middle;
    content: "";
    border-top-style: solid;
    border-top-width: 4px;
    border-right: 4px solid transparent;
    border-bottom: 0 solid transparent;
    border-left: 4px solid transparent;
`;

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

const VoteIcon = styled.div`
	display: inline-block;
	width: 12px;
	height: 12px;
`;

export const VoteYesIcon = (props) => (
	<VoteIcon {...props}>
		<svg viewBox="0 0 600 600">
			<defs id="defs1373">
				<linearGradient id="linearGradient2250">
					<stop style={{stopColor: '#008700', stopOpacity: 1}} offset="0" id="stop2252"/>
					<stop style={{stopColor: '#006f00', stopOpacity: 1}} offset="1" id="stop2254"/>
				</linearGradient>
			</defs>
			<path
				d="M 7.6885391,404.6142 C 7.6885391,404.6142 122.85389,534.30185 145.88696,587.27791 L 244.92916,587.27791 C 286.38869,460.59602 447.62018,158.16034 585.8186,52.208207 C 614.45182,15.394067 542.5208,0.19798715 484.4731,24.568517 C 396.98668,61.298507 231.98485,341.73657 201.16633,409.22081 C 157.4035,420.73735 111.33735,335.51499 111.33735,335.51499 L 7.6885391,404.6142 z "
				style={{fill:'#00bb00', fillOpacity:1, fillRule:'evenodd', stroke:'#000000', strokeWidth:2, strokeLinecap:'butt', strokeLinejoin:'miter', strokeMiterlimit:4, strokeDasharray:'none', strokeOpacity:1}}
			/>
		</svg>
	</VoteIcon>
)

export const VoteNoIcon = (props) => (
	<VoteIcon {...props}>
		<svg viewBox="0 0 525 600">
			<defs id="defs5">
				<linearGradient id="linearGradient2299">
					<stop style={{stopColor: '#ff0000', stopOpacity: 1}} offset="0" id="stop2301"/>
					<stop style={{stopColor: '#c70000', stopOpacity: 1}} offset="1" id="stop2303"/>
				</linearGradient>
				<radialGradient cx="262.5" cy="300" fx="262.5" fy="300" r="246.9456" gradientTransform="matrix(1,0,0,1.200021,0,-60.00638)" gradientUnits="userSpaceOnUse"/>
			</defs>
			<path
				d="M 15.554399,499.23617 C 15.554399,489.88388 49.262003,442.92493 90.460178,394.88295 C 131.65835,346.84096 171.36188,300.19332 178.69024,291.22150 C 186.01860,282.24967 178.40699,230.17136 161.77557,175.49190 C 127.32187,62.217924 124.18126,24.551078 147.96473,9.8520875 C 180.47155,-10.238240 225.08409,19.441293 262.53181,86.070496 L 300.46929,153.57113 L 371.71241,83.651323 C 418.55713,37.676699 451.99662,17.200896 469.35551,23.862122 C 503.70070,37.041618 523.52158,88.613119 497.56689,97.264679 C 468.10720,107.08456 346.17818,292.63354 346.40950,327.29275 C 346.51902,343.70450 363.84370,387.26650 384.90880,424.09720 C 399.76671,450.07512 419.73824,470.57451 411.81016,484.66521 L 369.43018,559.98778 C 361.21065,574.59648 330.85012,535.64770 294.88494,497.84045 L 232.14649,431.88864 L 162.59445,514.37325 C 124.34083,559.73979 88.627185,596.62407 83.230792,596.33832 C 77.834411,596.05256 15.554399,508.58848 15.554399,499.23617 z "
				style={{fill:'#bb0000', fillOpacity:1, stroke:'none', strokeWidth:2, strokeLinejoin:'round', strokeMiterlimit:4, strokeDasharray:'none', strokeOpacity:1}}
			/>
		</svg>
	</VoteIcon>
)

/*
 * Spinner from https://loading.io/css/
 */
const SpinnerWrap = styled.div`
	display: inline-flex;
	position: relative;
	width: 80px;
	height: 22px;
	align-items: center;
	& div {
		position: absolute;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #aaa;
		animation-timing-function: cubic-bezier(0, 1, 1, 0);
	}
	& div:nth-of-type(1) {
		left: 8px;
		animation: lds-ellipsis1 0.6s infinite;
	}
	& div:nth-of-type(2) {
		left: 8px;
		animation: lds-ellipsis2 0.6s infinite;
	}
	& div:nth-of-type(3) {
		left: 32px;
		animation: lds-ellipsis2 0.6s infinite;
	}
	& div:nth-of-type(4) {
		left: 56px;
		animation: lds-ellipsis3 0.6s infinite;
	}
	@keyframes lds-ellipsis1 {
		0% {
			transform: scale(0);
		}
		100% {
			transform: scale(1);
		}
	}
	@keyframes lds-ellipsis3 {
		0% {
			transform: scale(1);
		}
		100% {
			transform: scale(0);
		}
	}
	@keyframes lds-ellipsis2 {
		0% {
			transform: translate(0, 0);
		}
		100% {
			transform: translate(24px, 0);
		}
	}
`;
export const Spinner = (props) => <SpinnerWrap {...props}><div></div><div></div><div></div><div></div></SpinnerWrap>