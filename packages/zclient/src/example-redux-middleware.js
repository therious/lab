import axios from 'axios';
import {reqIdGenerate} from "./reqIdGenerator";

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


const camelCaseRegEx = /([a-z0-9]|(?=[A-Z]))([A-Z])/g;
function omsTypeToPath(atype) {
    const camelCased=atype.slice(3); // remove first three letters
    return camelCased.replace(camelCaseRegEx, '$1/$2').toLowerCase();
}

function createUrl(action, method) {
    const actMethod = action[method];            // either a string or just truthy value
    const path = (typeof(actMethod) === 'string')? actMethod: omsTypeToPath(action.type);
    const tailPath = action.tail? '/'+action.tail:'';
    return `${baseUrl}${path}${tailPath}`;
}

export const getMiddleware = store => next => action => {

    const aType = action.type || '';

    const startsWithOms = aType.startsWith('oms');
    const isResponse = startsWithOms && aType.endsWith('Response');

    reqIdGenerate();


    if(startsWithOms && !isResponse)
    {
        const rAction = aType+'Response';
        const responsef = (response)=>_actions[rAction](response);
        const catchf = error=>console.error(error);

        const method = action.post? 'post': 'get';
        const url = createUrl(action,method);

        console.log(`%c ${aType} sends ${url}`, middlestyle);

        switch(method)
        {
            case 'post':
                axios.post(url, {...action.body}).then(responsef).catch(catchf);
                break;
            case 'get':
            default:
                if(action.params)
                    axios.get(url, {params:action.params} ).then(responsef).catch(catchf);
                else
                    axios.get(url).then(responsef).catch(catchf);
        }
    }

    next(action);
};
