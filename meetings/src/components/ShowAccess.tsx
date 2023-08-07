import { Row } from 'dot11-components';
import { AccessLevel } from '../store/user';

function renderAccess(access: number) {
	if (access === AccessLevel.admin)
		return "admin";
	if (access === AccessLevel.rw)
		return "rw";
	if (access === AccessLevel.ro)
		return "ro";
	return "none";
}

function ShowAccess({access}: {access: number}) {
    return (
        <Row style={{justifyContent: 'flex-end', opacity: 0.5}}>
			{renderAccess(access)}
		</Row>
    )
}

export default ShowAccess;
