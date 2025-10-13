import { CookieJar } from "tough-cookie";
import { cookie } from "http-cookie-agent/undici";
import { fetch, EnvHttpProxyAgent, RequestInit } from "undici";
import qs from "node:querystring";
import { AuthError, ForbiddenError, NotFoundError } from "./error.js";

export class IeeeHttpClient {
	private baseURL: string = "https://imat.ieee.org";
	private dispatcher: EnvHttpProxyAgent;

	constructor() {
		const proxyAgent = new EnvHttpProxyAgent();
		const cookieAgent = cookie({ jar: new CookieJar() });
		this.dispatcher = proxyAgent.compose(cookieAgent);
	}

	async fetch(method: "GET" | "POST", url: string, options?: RequestInit) {
		options = { ...options, method, dispatcher: this.dispatcher };
		if (url.search(/^http[s]{0,1}:/) === -1) url = this.baseURL + url;
		const response = await fetch(url, options);
		if (!response.ok) {
			const msg = `${method} ${url}: ${response.statusText}`;
			if (response.status === 403) throw new ForbiddenError(msg);
			if (response.status === 404) throw new NotFoundError(msg);
			throw new TypeError(msg);
		}

		return response;
	}

	async get(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<string> {
		if (params) url += "?" + qs.stringify(params);
		const response = await this.fetch("GET", url, options);
		if (response.headers.get("content-type") !== "text/html") {
			throw new Error("Unexpected response");
		}
		return response.text();
	}

	async post(
		url: string,
		params: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<string> {
		options = { ...options };
		options.body = qs.stringify(params);
		if (!options.headers) options.headers = {};
		options.headers["Content-Type"] = "application/x-www-form-urlencoded";
		const response = await this.fetch("POST", url, options);
		if (response.headers.get("content-type") !== "text/html") {
			throw new Error("Unexpected response");
		}
		return response.text();
	}
}

const loginUrl = "/pub/login";
const logoutUrl = "/pub/logout";

function isSignInPage(data: string) {
	return data.search(/<div class="title">Sign In<\/div>/) !== -1;
}

export class IeeeClient extends IeeeHttpClient {
	private loginForm: Record<string, string | number> | undefined;

	constructor() {
		super();
	}

	async execLogin() {
		if (!this.loginForm) throw new AuthError("Not logged in");

		// Post the login data. There will be a bunch of redirects, but we should get a logged in page.
		const data = await this.post(loginUrl, this.loginForm);
		if (isSignInPage(data)) {
			const m = /<div class="field_err">([^<]*)<\/div>/.exec(data);
			throw new Error(m ? m[1] : "Failed to log in");
		}

		const m =
			/<span class="attendance_nav">Home - (.*), SA PIN: (\d+)<\/span>/.exec(
				data
			);
		if (!m) {
			const m = /<div class="title">([^<]*)<\/div>/.exec(data);
			throw new Error(m ? m[1] : "Unexpected login page");
		}

		const Name = m[1];
		const SAPIN = parseInt(m[2], 10);
		return { SAPIN, Name };
	}

	async login(username: string, password: string) {
		// Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
		// if we don't get the cookies associated with this GET, then the server seems to get confused
		// and won't have the approriate state post login.
		const data = await this.get(loginUrl);
		if (!isSignInPage(data)) {
			throw new Error("Unexpected login page");
		}

		let m = /name="v" value="(.*)"/.exec(data);
		const v = m ? m[1] : "1";
		m = /name="c" value="(.*)"/.exec(data);
		const c = m ? m[1] : "";

		this.loginForm = {
			v: v, //: $('input[name="v"]').val(),
			c: c, //: $('input[name="c"]').val(),
			x1: username,
			x2: password,
			f0: 1, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
			privacyconsent: "on",
			ok_button: "Sign+In",
		};

		const { SAPIN, Name } = await this.execLogin();

		return { SAPIN, Name, Email: username };
	}

	async logout() {
		this.loginForm = undefined;
		await this.get(logoutUrl);
	}

	verifyPreviousLogin() {
		if (!this.loginForm) throw new AuthError("Not logged in");
	}

	async getCsv(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<Buffer> {
		this.verifyPreviousLogin();
		if (params) url += "?" + qs.stringify(params);
		let response = await this.fetch("GET", url, options);
		if (response.headers.get("content-type") !== "text/csv") {
			const data = await response.text();
			if (!isSignInPage(data)) {
				throw new Error("Unexpected response");
			}
			await this.execLogin();
			response = await this.fetch("GET", url, options);
			if (response.headers.get("content-type") !== "text/csv") {
				throw new AuthError("Not logged in");
			}
		}
		return Buffer.from(await response.arrayBuffer());
	}

	async getHtml(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<string> {
		this.verifyPreviousLogin();
		if (params) url += "?" + qs.stringify(params);
		let response = await this.fetch("GET", url, options);
		if (response.headers.get("content-type") !== "text/html") {
			throw new Error("Unexpected response");
		}
		let data = await response.text();
		if (isSignInPage(data)) {
			await this.execLogin();
			response = await this.fetch("GET", url, options);
			if (response.headers.get("content-type") !== "text/html") {
				throw new Error("Unexpected response");
			}
			data = await response.text();
		}
		return data;
	}

	async postForm(
		url: string,
		params: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<string> {
		this.verifyPreviousLogin();
		let data = await this.post(url, params, options);
		if (isSignInPage(data)) {
			await this.execLogin();
			data = await this.post(url, params, options);
			if (isSignInPage(data)) {
				throw new AuthError("Not logged in");
			}
		}
		return data;
	}
}
