import PropTypes from 'prop-types';
import React from 'react';
//import {Select} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';

const positions = ["Chair", "Vice chair", "Secretary", "Technical editor", "Other"];

function Dropdown({close, positions, onChange}) {

	function handleChange(value) {
		onChange(value);
		close();
	}

	return (
		<div>
			{positions.map(pos => 
				<div
					key={pos}
					onClick={() => handleChange(pos)}
				>
					{pos}
				</div>)}
		</div>
	)
}

function OfficerPositionSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	return (
		<ActionButtonDropdown
			name='add'
			portal
			anchorEl={document.querySelector('#root')}
			dropdownRenderer={props => <Dropdown positions={positions} onChange={onChange} {...props} />}
		/>
	)
}

OfficerPositionSelector.propTypes = {
	value: PropTypes.array,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default OfficerPositionSelector;
