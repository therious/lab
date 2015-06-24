
var expect = require('chai').expect;
var fizbin = require('../fizbin');


var FsmFactory = fizbin.FsmFactory;
var fsm        = fizbin.fsm;

// first define two logging methods to attach to entering and exiting states generally

function f_enter(s,p,id) {
  console.log('fsm id:', id, 'enters state:', s, 'from previous state:', p);

}

function f_exit(s,n,id) {
  console.log('fsm id:', id, 'exits state:', s, 'to transition to state', n);
}

//-----------------------------------------------


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
  ,enter: f_enter
  ,exit: f_exit
  ,enterOn: function(s,p,id) { f_enter(s,p,id); if(s !== p) { console.log('light is on');  } }
  ,exitOn: function(s,n,id)  { f_exit(s,n,id);  if(s !== n) { console.log('light is off'); } }
};

// this is the specification of the state machine. It is totally independent of associated behavior
SecurityLight.config =
{
   start:   'Night'                   // initial state
  ,states: ['Day', 'Night', 'On']     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,io: {
  ambientLight: fsm.logical,
  temperature: fsm.numeric
  }

  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
       {from: 'Day',          to: 'Night', when:'!ambientLight'}    // transition on variable changes
      ,{from: ['On','Night'], to: 'Day',   when: 'ambientLight'}    // two src states have same transition to dest
      ,{from: ['On','Night'], to: 'On',    evt: 'motion'       }    // transition on receiving event tokens
      ,{from: 'On',           to: 'Night', timer:5000          }    // fizbin generates timer based events
    ]

  ,options:{}
};

SecurityLight.factorize();




describe('#InstantiationTest', function() {
  it('Instantiate an fsm', function () {
    var sl1 = new SecurityLight('sl-1');

    sl1.fsm.transduce('motion');
    sl1.fsm.transduce('motion');
    sl1.fsm.transduce('motion');

    sl1.fsm.ambientLight(true);

  });
});



describe('#Visualization', function() {
  it('Visualize an fsm', function () {
    var sl2 =   new SecurityLight('sl-2');

    var str = sl2.fsm.visualize();
    console.log(str);

  });
});