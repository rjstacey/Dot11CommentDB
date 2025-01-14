import { useRouteError } from "react-router";

function AppErrorPage() {
	const error = useRouteError();
	let message: string;
	if (typeof error === "string") {
		message = error;
	} else if (error instanceof Error) {
		message = error.name + ": " + error.message;
	} else {
		try {
			message = (error as object).toString();
		} catch {
			message = JSON.stringify(error);
		}
	}

	return (
		<div id="error-page">
			<h1>Oops!</h1>
			<p>Sorry, an unexpected error has occurred.</p>
			<p>
				<i>{message}</i>
			</p>
		</div>
	);
}

export default AppErrorPage;
