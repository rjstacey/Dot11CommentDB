import PropTypes from 'prop-types';
import React from 'react';
import {List, ListItem, Checkbox} from 'dot11-components/form';
import {isMultiple} from 'dot11-components/lib';

const CheckboxListSelect = ({value, onChange, label, options, readOnly}) =>
	<List
		label={label}
	>
		{options.map((o) => 
			<ListItem key={o.value}>
				<Checkbox
					id={'_' + o.value}
					value={o.value}
					checked={value === o.value}
					indeterminate={isMultiple(value)}
					onChange={e => onChange(parseInt(e.target.value, 10))}
					disabled={readOnly}
				/>
				<label htmlFor={'_' + o.value} >{o.label}</label>
			</ListItem>
		)}
	</List>

CheckboxListSelect.propTypes = {
	value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	onChange: PropTypes.func.isRequired,
	label: PropTypes.string.isRequired,
	options: PropTypes.arrayOf(PropTypes.shape({value: PropTypes.number, label: PropTypes.string})).isRequired,
	readOnly: PropTypes.bool,
};

export default React.memo(CheckboxListSelect);