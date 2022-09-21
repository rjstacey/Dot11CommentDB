import {DateTime} from 'luxon';

import {createAppTableDataSlice} from 'dot11-components/store/appTableData';

import {dataSet, fields, getField, selectSyncedTeleconEntities} from './teleconsSelectors';

const sortComparer = (a, b) => {
	// Sort by start
	const v1 = DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis();
	}
	return v1;
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	sortComparer,
	selectEntities: selectSyncedTeleconEntities,
});

export default slice;
