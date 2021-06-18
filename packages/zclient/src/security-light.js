import { createMachine, assign } from 'xstate';

// Action to increment the context amount
const addWater = assign({
    amount: (context, event) => context.amount + 1
});

// Guard to check if the glass is full
function glassIsFull(context, event) {
    return context.amount >= 10;
}
export const securityLightConfig = {
    id: 'seclight',
    // the initial context (extended state) of the statechart
    context: {
        ambientDaylight: false
    },
    initial: 'Night',
    states: {
        Night: {
            on: {
                motion: 'On',
                }
        },
        Day: {

        },
        On: {


        }

    }



}

export const glassMachineConfig = {
    id: 'glass',
    // the initial context (extended state) of the statechart
    context: {
        amount: 0
    },
    initial: 'empty',
    states: {
        empty: {
            on: {
                FILL: {
                    target: 'filling',
                    actions: 'addWater'
                }
            }
        },
        filling: {
            // Transient transition
            always: {
                target: 'full',
                cond: 'glassIsFull'
            },
            on: {
                FILL: {
                    target: 'filling',
                    actions: 'addWater'
                }
            }
        },
        full: {}
    }
}

const glassMachine = createMachine(
    glassMachineConfig,
    {
        actions: { addWater },
        guards: { glassIsFull }
    }
);
