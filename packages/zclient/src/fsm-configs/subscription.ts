import {fizbinToXState} from "../fsm-utils/fizbin-utills";
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


const x = {
  name:    'HeartbeatSubsciption',
  start:   Startup                                     // initial state
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
     lastStatus: '' // was heartbeat indicating UIB was up, or down?
  }



  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
      {from: Startup,     to: NoMemoryMaps,     evt: 'nomaps'      },
      {from: Startup,     to: Unmapped,         evt: 'keymissing'  },
      {from: Startup,     to: Mapped,           evt: 'keyfound'    },
      {from: Mapped,      to: FileOpened,       evt: 'opensuccess' },
      {from: Mapped,      to: NoFile,           evt: 'exception'   },

      {from: FileOpened,  to: Current,          evt: 'blah'        },
      {from: FileOpened,  to: CorruptionError,  evt: 'exception'   },
      {from: Current,     to: CorruptionError,  evt: 'exception'   },
      {from: Current,     to: Current,          evt: 'heartbeat'   },
      {from: Current,     to: Current,          evt: 'heartbeat'   },

      {from: Current,     to: Stale,            timer: 1000 * hbSecs       },
      {from: Stale,       to: Current,          evt: 'heartbeat'   },
      {from: Stale,       to: Toast,            timer: 1000 * hbSecs * (hbMax-1) }
    ]

  ,options:{}
};

export const heartbeatXStateConfig    = fizbinToXState(x);
export const umlHeartbeatSubscription = fizbinToPlantUml(x);