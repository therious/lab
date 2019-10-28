import axios from 'axios';

const middlestyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:salmon;
    color: black;
    `;

let _actions = undefined;

//  we will need to launch actions on API returns
export const init = (actions) =>
{
    _actions = actions;
};

export const crementMiddleWare = store => next => action => {
    const aType = action.type || '';

    if(aType.endsWith('crement'))
    {
        console.log(`%c ${aType}`, middlestyle);
    }

    next(action);
};



const baseUrl = 'http://localhost:5000';

export const getMiddleware = store => next => action => {

    const aType = action.type || '';

    if(aType.startsWith('oms'))
    {
        const rAction = aType+'Response';
        const responsef = (response)=>_actions[rAction](response);
        const catchf = error=>console.error(error);

        console.log(`%c ${aType}`, middlestyle);
        if(action.get) {
            const url = baseUrl + action.get + (action.tail||'');
            if(action.params)
                axios.get(url, {params:action.params} ).then(responsef).catch(catchf);
            else
                axios.get(url).then(responsef).catch(catchf);
        } else if(action.post) {
            const url = baseUrl + action.post + (action.tail||'');
            axios.post(url, {...action.body}).then(responsef).catch(catchf);
        }
    }

    next(action);
};
