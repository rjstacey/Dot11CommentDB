import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Checkbox} from 'dot11-components';
import {selectShowDateRange, setShowDateRange} from '../store/current';

import PathGroupSelector from './PathGroupSelector';
import PathSessionSelector from './PathSessionSelector';

function PathGroupAndSessionSelector({
	style,
	className,
	allowShowDateRange = false,
}: {
	style?: React.CSSProperties;
	className?: string;
	allowShowDateRange?: boolean;
}) {
	const dispatch = useDispatch();
	const showDateRange = useSelector(selectShowDateRange);
	return (
		<div style={{...style, display: 'flex'}} className={className}>
			<PathGroupSelector />
			<PathSessionSelector />
			{allowShowDateRange &&
				<div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginLeft: 10}}>
					<label>Show date range</label>
					<Checkbox
						checked={showDateRange}
						onChange={() => dispatch(setShowDateRange(!showDateRange))}
					/>
				</div>}
		</div>
	)
}

export default PathGroupAndSessionSelector;
