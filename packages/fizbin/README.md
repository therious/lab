# fizbin
Finite state machine

Example
```javascript
var fizbin = require('fizbin');


var FsmFactory = fizbin.FsmFactory;
var fsm        = fizbin.fsm;


// instantiate class with a sealed statemachine as an instance value
function SecurityLight(id)
{
  this.fsm = SecurityLight.factory.create(id, this);  // create an fsm instance
}

// define a class method to create a factory for SecurityLight fsm
SecurityLight.factorize = function() {
  SecurityLight.factory = new FsmFactory(SecurityLight);
};

SecurityLight.prototype = {
  constructor: SecurityLight
  
  // behaviors can be associated states by defining methods named for entering or exiting a specific state
  ,enter: say  // generic state entry logging
  ,exit: said  // generic state exit logging
  // ,enterOn: function() { log('I am on');  }
  // ,exitOn: function()  { log('I am off'); }
};

// this is the specification of the state machine. It is totally independent of associated behavior
SecurityLight.config =
{
   start:   'Night'                   // initial state
  ,states: ['Day', 'Night', 'On']     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,io:
  {
    ambientLight: fsm.logical,
    temperature: fsm.numeric
  }

  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
       {from: 'Day',   to: 'Night', when:'!ambientLight'} // transition on variable changes
      ,{from: 'Night', to: 'Day',   when: 'ambientLight'}
      ,{from: 'Night', to: 'On',    evt: 'motion'       } // transition on receiving event tokens
      ,{from: 'On',    to: 'On',    evt: 'motion'       }
      ,{from: 'On',    to: 'Night', timer:5000          } // fizbin generates timer based events
      ,{from: 'On',    to: 'Day',   when:'ambientLight' }
    ]

  ,options:{}
};

SecurityLight.factorize();

var sl1 = new SecurityLight('sl-1');

// sending an event manually from the outside sl1.fsm.transduce('motion');
// setting a variable sl1.fsm.ambientLight(true);

```
