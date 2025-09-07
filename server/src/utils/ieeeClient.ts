import { CookieJar } from "tough-cookie";
import { cookie } from "http-cookie-agent/undici";
import { fetch, EnvHttpProxyAgent, RequestInit } from "undici";
import qs from "node:querystring";

type IeeeClientResponse<T = string> = {
	headers: Headers;
	data: T;
};

export class IeeeClient {
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
			throw new Error(`${method} ${url}: ${response.statusText}`);
		}

		return response;
	}

	async get(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<IeeeClientResponse> {
		if (params) url += "?" + qs.stringify(params);
		const response = await this.fetch("GET", url, options);
		const data = await response.text();
		return {
			headers: response.headers,
			data,
		};
	}

	async getAsBuffer(
		url: string,
		params?: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<IeeeClientResponse<Buffer>> {
		if (params) url += "?" + qs.stringify(params);
		const response = await this.fetch("GET", url, options);
		const data = Buffer.from(await response.arrayBuffer());
		return {
			headers: response.headers,
			data,
		};
	}

	async post(
		url: string,
		params: qs.ParsedUrlQueryInput,
		options?: RequestInit
	): Promise<IeeeClientResponse> {
		options = { ...options };
		options.body = qs.stringify(params);
		if (!options.headers) options.headers = {};
		options.headers["Content-Type"] = "application/x-www-form-urlencoded";
		const response = await this.fetch("POST", url, options);
		const data = await response.text();
		return {
			headers: response.headers,
			data,
		};
	}
}
