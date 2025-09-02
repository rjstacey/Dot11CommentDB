import { Persistor } from "redux-persist";

export function createPersistReady(persistor: Persistor) {
	return new Promise<boolean>((resolve) => {
		const unsubscribe = persistor.subscribe(() => {
			const { bootstrapped } = persistor.getState();
			if (bootstrapped) {
				resolve(true);
				unsubscribe();
			}
		});
		const { bootstrapped } = persistor.getState();
		if (bootstrapped) {
			resolve(true);
			unsubscribe();
		}
	});
}
