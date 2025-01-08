import * as React from "react";
import "./App.css";

const ieeeSA_forgotPasswordLink =
	"https://www.ieee.org/profile/public/forgotpassword/forgotUsernamePassword.html?url=https://www.ieee.org";

const logoutUrl = "/logout";

async function errHandler(res: Response) {
	if (
		res.status === 400 &&
		res.headers.get("Content-Type")?.search("application/json") !== -1
	) {
		const ret = await res.json();
		return Promise.reject(ret.message);
	}
	let error: string | Error = await res.text();
	if (!error) {
		error = new Error(res.statusText);
	}
	//console.log(detail)
	return Promise.reject(error);
}

async function post(url: string, params: any) {
	const options: RequestInit = { method: "POST" };
	if (params) options.body = JSON.stringify(params);

	options.headers = {
		Accept: "application/json",
		"Content-Type": "application/json",
	};

	const res = await fetch(url, options);

	return res.ok ? res.json() : errHandler(res);
}

const LOGIN_STORAGE = "User";

async function login(username: string, password: string) {
	try {
		localStorage.removeItem(LOGIN_STORAGE);
	} catch (err) {}
	let user;
	try {
		const response = await post("/auth/login", { username, password });
		user = response.user;
	} catch (error) {
		window.alert(error);
		return null;
	}
	user.logoutUrl = logoutUrl;
	try {
		localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user));
	} catch (err) {}
	return user;
}

const leftArrowIcon = (
	<svg
		className="icon"
		viewBox="0 0 64 64"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M12.636 30.158H58v3.423H12.372l9.148 9.055L19.132 45 6 32l13.132-13 2.388 2.364-8.884 8.794z"></path>
	</svg>
);

const rightArrowIcon = (
	<svg
		className="icon"
		viewBox="0 0 64 64"
		fill="white"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M51.364 30.158H6v3.423h45.628l-9.148 9.055L44.868 45 58 32 44.868 19l-2.388 2.364 8.884 8.794z"></path>
	</svg>
);

const userIcon = (
	<svg
		className="icon"
		viewBox="0 0 64 64"
		fill="#989BA3"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M19.609 57c-2.131 0-4.107-.888-5.562-2.499-1.543-1.707-2.268-4.023-1.988-6.342l.856-7.167c.487-4.11 2.666-7.791 5.985-10.095l1.753 2.454c-2.609 1.812-4.329 4.725-4.715 7.989l-.859 7.17a5.074 5.074 0 0 0 1.242 3.999c.868.96 2.037 1.491 3.288 1.491H45.39c1.251 0 2.42-.531 3.288-1.491a5.074 5.074 0 0 0 1.242-3.999l-.855-7.167c-.39-3.267-2.107-6.177-4.72-7.992l1.754-2.454c3.319 2.307 5.501 5.988 5.989 10.098l.852 7.164c.28 2.319-.445 4.635-1.988 6.342C49.501 56.112 47.523 57 45.391 57H19.61zM18.8 19.5c0-7.443 6.147-13.5 13.7-13.5C40.054 6 46.2 12.057 46.2 19.5S40.053 33 32.5 33c-7.552 0-13.699-6.057-13.699-13.5zm3.045 0c0 5.79 4.78 10.5 10.655 10.5 5.875 0 10.655-4.71 10.655-10.5S38.376 9 32.5 9c-5.876 0-10.655 4.71-10.655 10.5z"
		></path>
	</svg>
);

const passwordIcon = (
	<svg
		className="icon"
		viewBox="0 0 24 24"
		fill="#989BA3"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M1.125 11.625c0-2.485 2.05-4.5 4.579-4.5 1.69 0 3.15.911 3.944 2.25h10.938l2.289 2.25-2.29 2.25h-1.717l-1.144-.563-1.145.563h-1.145l-1.144-.563-1.145.563H9.648a4.575 4.575 0 0 1-3.944 2.25c-2.529 0-4.579-2.015-4.579-4.5zm7.534-1.684A3.408 3.408 0 0 0 5.704 8.25c-1.893 0-3.434 1.514-3.434 3.375C2.27 13.485 3.81 15 5.704 15a3.408 3.408 0 0 0 2.955-1.69l.33-.56h3.886l.903-.444.511-.251.512.25.903.445h.605l.903-.444.512-.251.511.25.904.445h.973l1.144-1.125-1.144-1.125H8.989l-.33-.56zm-4.672 1.684c0-.933.77-1.688 1.717-1.688.948 0 1.717.755 1.717 1.688 0 .933-.77 1.688-1.717 1.688-.948 0-1.717-.755-1.717-1.688zm2.29 0a.568.568 0 0 0-.573-.563.568.568 0 0 0-.572.563c0 .31.257.563.572.563a.568.568 0 0 0 .572-.563z"
		></path>
	</svg>
);

const GoBackButton = () => (
	<button>
		{leftArrowIcon}
		<span>Go back</span>
	</button>
);

const SignInButton = () => (
	<button type="submit">
		<span>Sign In</span>
		{rightArrowIcon}
	</button>
);

const InputEmail = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) => (
	<div className="field">
		<label htmlFor="email">Email address:</label>
		<div className="input_container">
			{userIcon}
			<input
				id="email"
				type="email"
				name="email"
				autoComplete="username"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	</div>
);

const InputPassword = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) => (
	<div className="field">
		<label htmlFor="password">Password:</label>
		<div className="input_container">
			{passwordIcon}
			<input
				id="password"
				type="password"
				name="password"
				autoComplete="current-password"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	</div>
);

const ForgotPassword = () => (
	<div className="field">
		<a target="_blank" rel="noreferrer" href={ieeeSA_forgotPasswordLink}>
			&gt;Forgot password
		</a>
	</div>
);

function App() {
	const [credentials, setCredentials] = React.useState({
		username: "",
		password: "",
	});
	const urlParams = new URLSearchParams(window.location.search);
	const redirect = urlParams.get("redirect");

	const submit: React.FormEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		const user = await login(credentials.username, credentials.password);
		if (user && redirect) {
			window.location.href = redirect;
		}
	};

	return (
		<>
			<div className="overlay" />

			<main>
				<div className="header">IEEE 802.11 - Sign in for access</div>

				<div className="go_back">
					<GoBackButton />
				</div>

				<div className="form_title">
					<h2>Sign In</h2>
				</div>

				<form onSubmit={submit}>
					<InputEmail
						value={credentials.username}
						onChange={(value) =>
							setCredentials({ ...credentials, username: value })
						}
					/>
					<InputPassword
						value={credentials.password}
						onChange={(value) =>
							setCredentials({ ...credentials, password: value })
						}
					/>
					<ForgotPassword />
					<SignInButton />
				</form>
			</main>
		</>
	);
}

export default App;
