import { getCombinedReducer } from 'harmoware-vis'
import { createStore, applyMiddleware } from 'redux'
import createSagaMiddleware from 'redux-saga'

const saga = createSagaMiddleware()

const store = createStore(
	getCombinedReducer(),
	applyMiddleware(saga)
)

export default store;
