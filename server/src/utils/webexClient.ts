import {
	fetch,
	EnvHttpProxyAgent,
	RequestInit,
	Response,
	Headers,
} from "undici";
import qs from "node:querystring";
import { NotFoundError } from "./error.js";
import { isPlainObject } from "./general.js";

const webexApiBaseUrl = "https://webexapis.com/v1";
const webexAuthUrl = "https://webexapis.com/v1/authorize";
const webexTokenUrl = "https://webexapis.com/v1/access_token";

const webexAuthScope = [
	"spark:kms",
	"spark:all",
	"meeting:controls_read",
	"meeting:controls_write",
	"meeting:schedules_read",
	"meeting:schedules_write",
	"meeting:participants_read",
	"meeting:participants_write",
	"meeting:preferences_write",
	"meeting:preferences_read",
].join(" ");

const dispatcher = new EnvHttpProxyAgent();

export type WebexAuthParams = {
	access_token: string;
	refresh_token: string;
};

export class WebexClient {
	static webexClientId: string;
	static webexClientSecret: string;
	private authParams: WebexAuthParams | null = null;
	private setAuthParams:
		| ((
				authParams: WebexAuthParams | null,
				userId?: number
		  ) => Promise<unknown>)
		| undefined;
	public lastAccess: string | null = null;

	constructor(
		authParams: WebexAuthParams | null,
		setAuthParams?: (
			authParams: WebexAuthParams | null,
			userId?: number
		) => Promise<unknown>
	) {
		this.authParams = authParams;
		this.setAuthParams = setAuthParams;
	}

	/** Static function to initialize client ID and secret from environment variables */
	static init() {
		if (process.env.WEBEX_CLIENT_ID)
			WebexClient.webexClientId = process.env.WEBEX_CLIENT_ID;
		else console.warn("Webex API: Missing .env variable WEBEX_CLIENT_ID");

		if (process.env.WEBEX_CLIENT_SECRET)
			WebexClient.webexClientSecret = process.env.WEBEX_CLIENT_SECRET;
		else
			console.warn(
				"Webex API: Missing .env variable WEBEX_CLIENT_SECRET"
			);
	}

	async refreshToken() {
		if (!this.authParams) throw TypeError("No auth params");
		const params = {
			grant_type: "refresh_token",
			client_id: WebexClient.webexClientId,
			client_secret: WebexClient.webexClientSecret,
			refresh_token: this.authParams.refresh_token,
		};
		const options = {
			method: "POST",
			dispatcher,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: qs.stringify(params),
		};
		const response = await fetch(webexTokenUrl, options);
		if (!response.ok) {
			console.error(response);
			console.log(await response.json());
			throw new TypeError("Unable to refresh token");
		}
		this.authParams = (await response.json()) as WebexAuthParams;
		this.setAuthParams?.(this.authParams);
		this.lastAccess = new Date().toISOString();
	}

	async completeAuth(redirect_uri: string, code: string, userId: number) {
		const params = {
			grant_type: "authorization_code",
			client_id: WebexClient.webexClientId,
			client_secret: WebexClient.webexClientSecret,
			code: code,
			redirect_uri,
		};
		const options = {
			method: "POST",
			dispatcher,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: qs.stringify(params),
		};
		const response = await fetch(webexTokenUrl, options);
		if (!response.ok) {
			console.error(response);
			throw new TypeError("Unable to complete authorization");
		}
		this.authParams = (await response.json()) as WebexAuthParams;
		this.setAuthParams?.(this.authParams, userId);
		this.lastAccess = new Date().toISOString();
	}

	async revokeAuth() {
		this.authParams = null;
		await this.setAuthParams?.(null);
	}

	static getAuthUrl(redirect_uri: string, state: string) {
		const params = {
			client_id: WebexClient.webexClientId,
			response_type: "code",
			scope: webexAuthScope,
			redirect_uri,
			state,
		};
		return webexAuthUrl + "?" + qs.stringify(params);
	}

	async webexApiError(response: Response) {
		if (response.status >= 400 && response.status < 500) {
			if (response.status === 404)
				throw new NotFoundError("Webex meeting not found");
			const data = await response.json();
			if (isPlainObject(data)) {
				const { message, errors } = data;
				const description = `${message}\n` + errors?.join("\n");
				throw new Error(
					`Webex API error ${response.status}: ${description}`
				);
			}
		}
		throw new Error(response.statusText);
	}

	async fetch(
		method: "GET" | "POST" | "PATCH" | "DELETE",
		url: string,
		optionsIn?: RequestInit
	) {
		const headers = new Headers(optionsIn?.headers);
		if (this.authParams)
			headers.set(
				"Authorization",
				`Bearer ${this.authParams.access_token}`
			);

		let options = {
			...optionsIn,
			method,
			dispatcher,
			headers,
		};
		if (url.search(/^http[s]{0,1}:/) === -1) url = webexApiBaseUrl + url;
		let response = await fetch(url, options);
		if (!response.ok) {
			if (response.status === 401) {
				// If we get 'Unauthorized' then refresh the access token
				await this.refreshToken();
				// Resubmit request with new token
				headers.set(
					"Authorization",
					`Bearer ${this.authParams!.access_token}`
				);
				options = {
					...options,
					headers,
				};
				response = await fetch(url, options);
				if (response.ok) {
					this.lastAccess = new Date().toISOString();
					return response;
				}
			}
			await this.webexApiError(response);
		}
		this.lastAccess = new Date().toISOString();
		return response;
	}

	async get<T = unknown>(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<T> {
		if (params) url += "?" + qs.stringify(params);
		const response = await this.fetch("GET", url, options);
		return (await response.json()) as T;
	}

	async post<T = unknown>(
		url: string,
		params: string | number | object,
		optionsIn?: RequestInit
	): Promise<T> {
		const headers = new Headers(optionsIn?.headers);
		headers.set("Content-Type", "application/json");
		const options = {
			...optionsIn,
			body: JSON.stringify(params),
			headers,
		};
		const response = await this.fetch("POST", url, options);
		return (await response.json()) as T;
	}

	async patch<T = unknown>(
		url: string,
		params: string | number | object,
		optionsIn?: RequestInit
	): Promise<T> {
		const headers = new Headers(optionsIn?.headers);
		headers.set("Content-Type", "application/json");
		const options = {
			...optionsIn,
			body: JSON.stringify(params),
			headers,
		};
		const response = await this.fetch("PATCH", url, options);
		return (await response.json()) as T;
	}

	async delete(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<void> {
		if (params) url += "?" + qs.stringify(params);
		await this.fetch("DELETE", url, options);
	}
}
