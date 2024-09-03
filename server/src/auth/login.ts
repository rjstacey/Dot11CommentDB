import { Router } from "express";
import type { AxiosInstance, AxiosResponse } from "axios";
import { createIeeeClient } from "../utils";
import { selectUser, getUser, setUser, delUser } from "../services/users";

//const cheerio = require('cheerio');
import { verify, token } from "./jwt";
import { AccessLevel } from "./access";

const loginUrl = "/pub/login";
const logoutUrl = "/pub/logout";

async function login(
	ieeeClient: AxiosInstance,
	username: string,
	password: string
) {
	let m: RegExpExecArray | null, response: AxiosResponse;

	// Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
	// if we don't get the cookies associated with this GET, then the server seems to get confused
	// and won't have the approriate state post login.
	response = await ieeeClient.get(loginUrl);

	if (
		response.headers["content-type"] !== "text/html" ||
		typeof response.data !== "string" ||
		response.data.search(/<div class="title">Sign In<\/div>/) === -1
	) {
		throw new Error("Unexpected login page");
	}

	//const $ = cheerio.load(response.data);
	m = /name="v" value="(.*)"/.exec(response.data);
	const v = m ? m[1] : "1";
	m = /name="c" value="(.*)"/.exec(response.data);
	const c = m ? m[1] : "";

	const loginForm = {
		v: v, //: $('input[name="v"]').val(),
		c: c, //: $('input[name="c"]').val(),
		x1: username,
		x2: password,
		f0: 1, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
		privacyconsent: "on",
		ok_button: "Sign+In",
	};

	// Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
	// options.form = loginForm;
	response = await ieeeClient.post(loginUrl, loginForm);
	//console.log(response)

	if (response.data.search(/<div class="title">Sign In<\/div>/) !== -1) {
		m = /<div class="field_err">([^<]*)<\/div>/.exec(response.data);
		//console.log(response.data)
		throw new Error(m ? m[1] : "Not logged in");
	}

	m = /<span class="attendance_nav">Home - (.*), SA PIN: (\d+)<\/span>/.exec(
		response.data
	);
	if (!m) {
		m = /<div class="title">([^<]*)<\/div>/.exec(response.data);
		throw new Error(m ? m[1] : "Unexpected login page");
	}

	const Name = m[1];
	let SAPIN = parseInt(m[2], 10);

	//if (SAPIN === 5073) {
	//	SAPIN = 77458; // Po-Kai
	//SAPIN = 5030; //Jon Rosdahl
	//SAPIN = 5066; //Lei Wang
	//SAPIN = 13492;
	//}

	// Add an interceptor that will login again if a request returns the login page
	ieeeClient.interceptors.response.use((response) => {
		if (response.headers["content-type"] !== "text/html") return response;
		const responseType = response.request.responseType;
		let text: string;
		if (responseType === "arraybuffer") {
			const enc = new TextDecoder();
			text = enc.decode(response.data);
		} else if (typeof response.data === "string") {
			text = response.data;
		} else {
			console.warn("Can't handle responseType=" + responseType);
			console.warn("typeof data=" + typeof response.data);
			return response;
		}
		if (text.search(/<div class="title">Sign In<\/div>/) !== -1) {
			console.log("Try login again");
			m = /name="v" value="(.*)"/.exec(response.data);
			const v = m ? m[1] : "1";
			m = /name="c" value="(.*)"/.exec(response.data);
			const c = m ? m[1] : "aNA__";
			const loginForm = {
				v,
				c,
				x1: username,
				x2: password,
				f0: 1,
				privacyconsent: "on",
				ok_button: "Sign+In",
			};
			return ieeeClient.post(loginUrl, loginForm);
		}
		return response;
	});

	return { SAPIN, Name, Email: username };
}

export function logout(ieeeClient: AxiosInstance) {
	return ieeeClient.get(logoutUrl);
}

/*
 * login API
 *
 * GET /login: get current user information
 * POST /login: login with supplied credentials and return user information
 * POST /logout: logout
 */
const router = Router();

router
	.get("/login", async (req, res, next) => {
		try {
			const userId = Number(verify(req));
			const { ieeeClient, ...user } = await getUser(userId);
			res.json({ user });
		} catch (err) {
			res.json({ user: null });
		}
	})
	.post("/login", async (req, res, next) => {
		try {
			// credentials
			const { username, password } = req.body;

			const ieeeClient = createIeeeClient();

			const { SAPIN, Name, Email } = await login(
				ieeeClient,
				username,
				password
			);
			//const SAPIN = 5073, Name = "Robert Stacey", Email= "rjstacey@gmail.com";

			const user = (await selectUser({ SAPIN, Email })) || {
				SAPIN,
				Name,
				Email,
				Access: AccessLevel.none,
				Permissions: [],
			};

			user.Token = token(user.SAPIN);
			setUser(user.SAPIN, { ...user, ieeeClient });

			res.json({ user });
		} catch (err) {
			next(err);
		}
	})
	.post("/logout", async (req, res, next) => {
		try {
			const userId = Number(verify(req));
			const user = await getUser(userId);
			if (user) {
				if (user.ieeeClient) logout(user.ieeeClient);
				delUser(user.SAPIN);
			}
			res.json({ user: null });
		} catch (err) {
			next(err);
		}
	});

export default router;
