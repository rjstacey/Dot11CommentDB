import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';

import errMsg from 'dot11-components/store/error';
import telecons from './telecons';
import webexAccounts from './webexAccounts';
import calendarAccounts from './calendarAccounts';
import timeZones from './timeZones';
import groups from './groups';
import officers from './officers';
import members, {loadMembers} from './members';

function configureStore() {

	const reducer = combineReducers({
		errMsg,
		telecons,
		webexAccounts,
		calendarAccounts,
		timeZones,
		groups,
		officers,
		members
	});

	const middleware = [thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const store = createStore(
		reducer,
		composeWithDevTools(applyMiddleware(...middleware))
	);

	store.dispatch(loadMembers());

	return {store};
}

export default configureStore;
