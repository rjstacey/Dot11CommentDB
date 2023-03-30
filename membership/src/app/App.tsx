import React from 'react';
import {BrowserRouter as Router} from 'react-router-dom';
import styled from '@emotion/styled';
import {Helmet} from 'react-helmet';

import {ErrorModal, ConfirmModal} from 'dot11-components';
import Header from './Header';
import Body from './Body';

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	align-items: center;
`;

const title = '802.11 Members';
const description = 'Manage 802.11 membership';

function App() {
	return (
		<>
			<Helmet>
				<title>{title}</title>
				<meta name='description' content={description} />
			</Helmet>
			<Router basename='/membership'>
				<OuterDiv>
					<Header />
					<Body />
					<ErrorModal />
					<ConfirmModal />
				</OuterDiv>
			</Router>
		</>
	)
}

export default App;
