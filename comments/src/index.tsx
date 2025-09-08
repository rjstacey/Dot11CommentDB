import { createRoot } from "react-dom/client";
import App from "./app";

const rootEl = document.getElementById("root");
if (!rootEl) {
	const m = `No <div id="root" /> in index.html`;
	console.error(m);
	alert(m);
} else {
	createRoot(rootEl).render(<App />);
}
