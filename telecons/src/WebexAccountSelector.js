import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {Select} from 'dot11-components/general/Form'

import {loadWebexAccounts} from './store/webex'

function WebexAccountSelector({
	style,
	className,
	value,
	onChange,
	entities,
	ids,
	valid,
	loading,
	loadWebexAccounts,
	readOnly,
	...otherProps
}) {

	React.useEffect(() => {
		if (!valid && !readOnly)
			loadWebexAccounts();
	}, [valid, readOnly]);

	const options = React.useMemo(() => ids.map(id => ({value: id, label: entities[id].shortName})));
	const optionSelected = options.find(o => o.value === value);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

	return (
		<Select
			style={style}
			className={className}
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

WebexAccountSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	entities: PropTypes.object.isRequired,
	ids: PropTypes.array.isRequired,
	loadWebexAccounts: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

const dataSet = 'webex';

export default connect(
	(state) => {
		return {
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			entities: state[dataSet].entities,
			ids: state[dataSet].ids,
		}
	},
	{loadWebexAccounts}
)(WebexAccountSelector);
