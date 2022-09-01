import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';


export const sendEmail = (email) =>
	async (dispatch, getState) => {
		try {
			await fetcher.post('/api/email', email);
		}
		catch (error) {
			setError('Unable to send email: ', error);
		}
	}
