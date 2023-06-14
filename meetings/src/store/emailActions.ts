import { fetcher, setError } from 'dot11-components';
import { AppThunk } from '.';

export const sendEmail = (email: any): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.post('/api/email', email);
		}
		catch (error) {
			setError('Unable to send email: ', error);
		}
	}
