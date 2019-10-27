export function Increment(state, {counter})
{
    const val = state[counter] + 1;
    return  {...state, [counter]:val}
}

export function Decrement(state, {counter})
{
    const val = state[counter] - 1;
    return  {...state, [counter]:val}
}
