import { createMachine, assign } from 'xstate';
import {fizbinToXState} from "./fsm-utils/fizbin-utills";
import {fizbinToPlantUml} from "./fsm-utils/fsm-visualization";
// Action to increment the context amount
const addWater = assign({
  amount: (context, event) => context.amount + 1
});

// Guard to check if the glass is full
function glassIsFull(context, event) {
  return context.amount >= 10;
}

const On='On', Day='Day',Night='Night';

export const securityLightGuards = {
  daylight: (ctx,evt)=>ctx.ambientLight > 0.5,
  dimlight: (ctx,evt)=>ctx.ambientLight < 0.5,
}


const x = {
  name:    'sec2',
  start:   Night                  // initial state
  ,states: [Day,Night,On]     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,io: { ambientLight: 0.1 }

  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
      {from: Day,        to: Night,  when: 'dimlight'  } // transition on variable changes
      ,{from: [Night,On], to: Day,    when: 'daylight'  }
      ,{from: [Night,On], to: On,      evt: 'motion'    } // transition on receiving event tokens
      ,{from: On,         to: Night, timer: 5000        } // fizbin generates timer based events
    ]

  ,options:{}
};


const y = {




}


export const sec2 = fizbinToXState(x);
export const securityLightPlantUml = fizbinToPlantUml(x);

export const securityLightConfig = {
  id: 'seclight',
  // the initial context (extended state) of the statechart
  context: {
    ambientLight: 0.1,
  },
  initial: Night,
  states: {
    Night: {
      on: { motion: On },
      always: { target: Day, cond: 'daylight' }
    },
    Day: {
      always: { target: Day, cond: 'dimlight' }
    },
    On: {
      on:     { motion: On },
      after:  {   5000: { target: Night}      },
      always: { target: Day, cond: 'daylight' }
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

// const glassMachine = createMachine(
//   glassMachineConfig,
//   {
//     actions: { addWater },
//     guards: { glassIsFull }
//   }
// );
