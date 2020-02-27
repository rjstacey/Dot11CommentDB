import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger'
import { Provider } from 'react-redux';
import rootReducer from './reducers';
//import { composeWithDevTools } from 'redux-devtools-extension'
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import './index.css'

const store = createStore(
	rootReducer,
	applyMiddleware(thunkMiddleware, createLogger({collapsed: true}))
);

render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('root')
);
registerServiceWorker();
