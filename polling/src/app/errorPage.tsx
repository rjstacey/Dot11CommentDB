import { useRouteError } from "react-router";

export function AppErrorPage() {
	const error = useRouteError();
	console.error(error);
	let m: string;
	if (typeof error === "string") {
		m = error;
	} else if (error instanceof Error) {
		m = error.message;
		if ("statusText" in error && typeof error.statusText === "string")
			m = error.statusText;
	} else {
		m = "Unrecognized error type";
	}

	return (
		<div id="error-page">
			<h1>Oops!</h1>
			<p>Sorry, an unexpected error has occurred.</p>
			<p>
				<i>{m}</i>
			</p>
		</div>
	);
}
