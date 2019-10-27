import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware, combineReducers, bindActionCreators} from 'redux'
import { Provider, connect } from 'react-redux'
import { composeWithDevTools } from 'redux-devtools-extension';

import './index.css';
import App from './App';
import {initialState} from "./constants/initial-state";
import * as actions from './action-creators'
import * as funcs from './action-funcs';

import {crementMiddleWare} from "./example-redux-middleware";

const actionstyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:plum;
    color: black;
    `;

function myreducer(state = initialState, action) {
    console.log(`%c +action - ${action.type}`, actionstyle, action);
    const actionf = funcs[action.type];
    return actionf? actionf(state,action): state;
}

const rootReducer = combineReducers({myreducer });

const store = createStore(
    rootReducer,
    composeWithDevTools(
        applyMiddleware(crementMiddleWare)
    )
);


const mapStateToProps = state => {
   return state.myreducer;
};


const mapDispatchToProps = dispatch => ({
    actions: bindActionCreators(actions, dispatch)
});

const ConnectedApp =  connect(
    mapStateToProps,
    mapDispatchToProps
)(App);

render(
    <Provider store={store}>
        <ConnectedApp/>
    </Provider>,
    document.getElementById('root')
);

