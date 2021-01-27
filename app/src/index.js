//import {hot} from 'react-hot-loader'
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

//const App = (props) => <h2>Hi World!</h2>
//const _App = hot(module)(App)

/*
	<Provider store={store}>
		<App />
	</Provider>
*/


ReactDOM.render(
	<App />,
	document.getElementById('root')
);

if (module.hot) {
   module.hot.accept('./App.js', function() {
     console.log('Accepting the updated App module!');
   })
}

registerServiceWorker();
