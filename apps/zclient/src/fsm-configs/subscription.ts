import {createXStateConfiguration} from "../fsm-utils/convert";
import {fizbinToPlantUml} from "../fsm-utils/fsm-visualization";

/*

[*]-->Unmapped
Unmapped-->Mapped
Mapped-[#red,bold]->NoFile   : subscribe failure
Mapped-->File     : subscribed
File-->Current    : heartbeat
Current-->Current : heartbeat
Current-[#blue,dotted]->Stale   : delay
Stale-->Current   : heartbeat
Stale-[#blue,dotted]->Toast      : 5 seconds

Note left of Toast : Enter:Restart UIC
Toast-->Mapped

 */

const Startup='Startup',
      NoMemoryMaps    ='NoMemoryMaps',
      Unmapped        ='Unmapped',
      Mapped          ='Mapped',
      FileOpened      ='FileOpened',
      NoFile          ='NoFile',
      CorruptionError ='CorruptionError',
      Current         ='Current',
      Stale           ='Stale',
      Toast           ='Toast';

/*
  every possible state
  Startup:        we know nothing
  NoMemoryMaps!:  (terminal) the app environment does not even support mapping files
  Unmapped!:      (terminal) requested file is not mapped
  Mapped:         file was found will attempt to subscript
  the requested file is mapped, but the physical file cannot be found
  the physical file is found but it must be corrupt, since reading it produces an exception
  the file is successfully read, we are current as long as it updates on time
  it updates on time, but the status within the update says upstream UIB is not communicating
  no update has been received for a short while
  no update has been received for a long while


*/
const hbSecs = 10;
const hbMax  = 3;

/*
  Aside from simple terminal vs non-terminal node visualization distinction
  need a way to provide visualization hints for node to represent the following distinctions

  terminal - no recovery
  terminal - with automated action that restarts system
  ideal state - one state is the target state, it should draw attention

  stepping stone state        - all states leading in target state (if no target state then all states in line from start to terminal states)
  ideal/target state          - one state we are trying to maintain
  recoverable state           - not stepping, terminal, or ideal
  terminal state, no recovery - a state that cannot fix itself
  terminal rebooting state    - a terminal state in terms of machine, but one which restarts same machiune



aside from automatically marking some states as terminal,
need a way to hint to visualizations that some starts indicate an issue, other states are an ideal target state
 */

const x = {
  name:    'HeartbeatSubsciption',
  start:   Startup,                                     // initial state
  target: Current // optional target property designates one state to stand out as a target or ideal state
  ,states: [
    Startup,    // system startup, no environmental check
    NoMemoryMaps,
    Unmapped,
    Mapped,
    NoFile,
    FileOpened,
    CorruptionError,
    Current,
    Stale,
    Toast
  ]     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,io: {
     fileKey:  '',
     fileName: '',
     lastUicHb: -1,
     lastUibHb: -1,
     lastUibUpdate: -1,
  }



  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
      {from: Startup,         to: NoMemoryMaps,     evt: 'nomaps'      },
      {from: Startup,         to: Unmapped,         evt: 'keymissing'  },
      {from: Startup,         to: Mapped,           evt: 'keyfound'    },
      {from: [Mapped,NoFile], to: FileOpened,       evt: 'opensuccess' },
      {from: [Mapped,NoFile], to: NoFile,           evt: 'exception'   },

      {from: FileOpened,      to: Current,          evt: 'blah'        },
      {from: FileOpened,      to: CorruptionError,  evt: 'exception'   },
      {from: Current,         to: CorruptionError,  evt: 'exception'   },
      {from: Current,         to: Current,          evt: 'heartbeat'   },

      {from: Current,         to: Stale,            timer: 1000 * hbSecs },
      {from: Stale,           to: Current,          evt: 'heartbeat'   },
      {from: Stale,           to: Toast,            timer: 1000 * hbSecs * (hbMax-1) }
    ]

  ,options:{}
};


const restartUic = 'restartUic';
const errorAlert = 'errorAlert';

const behaviors = {
  // enter:                'logEntry',
  // exit:                 'logExit',
  enterNoMemoryMaps:    errorAlert,
  enterUnmapped:        errorAlert,
  enterNoFile:          'retry subscribe after delay',
  enterCorruptionError: restartUic,
  enterToast:           restartUic,
  enterMapped:          'subscribe'
}

export const heartbeatXStateConfig    = createXStateConfiguration(x,behaviors);
export const umlHeartbeatSubscription = fizbinToPlantUml(x, behaviors);