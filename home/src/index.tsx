import React from "react";
import { createRoot } from "react-dom/client";
import { store, persistor } from "./store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./app";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

root.render(
	<React.StrictMode>
		<Provider store={store}>
			<PersistGate persistor={persistor} loading={null}>
				<App />
			</PersistGate>
		</Provider>
	</React.StrictMode>
);
