import { createRoot } from "react-dom/client";
import { getUser, loginAndReturn, fetcher } from "dot11-components";
import App from "./app";

getUser()
	.then((user) => {
		try {
			fetcher.setAuth(user.Token, loginAndReturn); // Prime fetcher with autherization token
			const rootEl = document.getElementById("root");
			if (!rootEl)
				throw new Error(
					`No element with id="root" (e.g., <div id="root" />) in index.html`
				);
			createRoot(rootEl).render(<App user={user} />);
		} catch (error) {
			console.log(error);
		}
	})
	.catch((error) => {
		console.error(error);
		loginAndReturn();
	});
