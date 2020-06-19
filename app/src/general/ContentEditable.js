import PropTypes from 'prop-types';
import React, {useRef, useState, useEffect} from 'react';

/**
 * @function
 * @description This function is used to determine the text node and it's index within
 * a "root" DOM element.
 *
 * @param  {DOMElement} rootEl The root
 * @param  {Integer} index     The index within the root element of which you want to find the text node
 * @return {Object}            An object that contains the text node, and the index within that text node
 */
function getTextNodeAtPosition(rootEl, index) {
    const treeWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, elem => {
        if (index > elem.textContent.length) {
            index -= elem.textContent.length;
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    const node = treeWalker.nextNode();

    return {
        node: node? node: rootEl,
        position: node? index: 0,
    };
};

function _ContentEditable(props, ref) {
	const [lastHtml, setLastHtml] = useState(props.value);
	const [hasChanged, setHasChanged] = useState(false);
	const index = useRef({startIndex: 0, endIndex: 0});
	const innerRef = useRef(null);
	if (ref) {
		useEffect(() => {ref.current = innerRef.current})
	}

	const selection = window.getSelection();
	//const container = props.innerRef.current
	const container = innerRef.current
	if (container && selection && selection.rangeCount) {
		const range = selection.getRangeAt(0);
		const clone = range.cloneRange();

		// find the range start index
		clone.selectNodeContents(container);
		clone.setStart(container, 0);
		clone.setEnd(range.startContainer, range.startOffset);
		index.current.startIndex = clone.toString().length;

		// find the range end index
		clone.selectNodeContents(container);
		clone.setStart(container, 0);
		clone.setEnd(range.endContainer, range.endOffset);
		index.current.endIndex = clone.toString().length;
	}

	useEffect(() => {
		if (selection && selection.rangeCount) { 
	    	const container = innerRef.current
			const start = getTextNodeAtPosition(container, index.current.startIndex);
			const end = getTextNodeAtPosition(container, index.current.endIndex);
			const newRange = new Range();

			newRange.setStart(start.node, start.position);
			newRange.setEnd(end.node, end.position);

			selection.removeAllRanges();
			selection.addRange(newRange);
			//container.focus();
		}
	})

	function emitChange(e) {
		console.log(hasChanged)
		if (props.onChange && hasChanged) {
			props.onChange({target: {value: lastHtml}});
			setHasChanged(false);
		}
	}

	function onInput(e) {
		const html = e.target.innerHTML;
		 if (props.onInput && html !== lastHtml) {
			props.onInput({target: {value: html}});
		}
		setLastHtml(html);
		setHasChanged(true);
	}

	return <div
		className={props.className}
		ref={innerRef}
		onInput={onInput}
		onChange={emitChange}
		contentEditable
		dangerouslySetInnerHTML={{__html: props.value}} />;
}
const ContentEditable = React.forwardRef(_ContentEditable);

ContentEditable.propTypes = {
	className: PropTypes.string,
	value: PropTypes.string.isRequired,
	onInput: PropTypes.func,
	onChange: PropTypes.func
}

export default ContentEditable;
