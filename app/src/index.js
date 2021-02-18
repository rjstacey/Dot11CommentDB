import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { Provider } from 'react-redux'
import rootReducer from './store/reducers'
//import { composeWithDevTools } from 'redux-devtools-extension'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import './index.css'

const store = createStore(
	rootReducer,
	applyMiddleware(thunkMiddleware, createLogger({collapsed: true}))
);

ReactDOM.render(
	<React.StrictMode>
		<Provider store={store}>
			<App />
		</Provider>
	</React.StrictMode>,
	document.getElementById('root')
);

registerServiceWorker();
