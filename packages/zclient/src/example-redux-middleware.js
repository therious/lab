const middlestyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:salmon;
    color: black;
    `;

export const crementMiddleWare = store => next => action => {

    if(action.type.includes('crement'))
    {
        console.log(`%c ${action.type}`, middlestyle);
    }

    next(action);
};

