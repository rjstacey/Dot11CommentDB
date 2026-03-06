import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Login from "./Login";

if (window.location.pathname.endsWith("logout")) {
	localStorage.removeItem("User");
	window.location.href = "/";
} else {
	const rootEl = document.getElementById("root")!;
	createRoot(rootEl).render(
		<StrictMode>
			<Login />
		</StrictMode>,
	);
}
