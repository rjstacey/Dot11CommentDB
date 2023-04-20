import React from 'react';
import {BrowserRouter as Router} from 'react-router-dom';
import styled from '@emotion/styled';
import {HelmetProvider, Helmet} from 'react-helmet-async';

import {ErrorModal, ConfirmModal} from 'dot11-components';
import Header from './Header';
import Body from './Body';

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	align-items: center;
`;

const title = '802 tools | Meetings';
const description = 'Manage 802.11 sessions and telecons';

function App() {
	return (
		<HelmetProvider>
			<Helmet>
				<title>{title}</title>
				<meta name='description' content={description} />
			</Helmet>
			<Router basename='/meetings'>
				<OuterDiv>
					<Header />
					<Body />
					<ErrorModal />
					<ConfirmModal />
				</OuterDiv>
			</Router>
		</HelmetProvider>
	)
}

export default App;
