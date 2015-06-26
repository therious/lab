
var expect = require('chai').expect;
var fizbin = require('../fizbin');


var FsmFactory = fizbin.FsmFactory;
var fsm        = fizbin.fsm;


//-----------------------------------------------

// instantiate class with a sealed statemachine as an instance value
function SimpleTimer(id)
{
  this.fsm = SimpleTimer.factory.create(id, this);  // create an fsm instance
}

// define a class method to create a factory for SecurityLight fsm
SimpleTimer.factorize = function() {
  SimpleTimer.factory = new FsmFactory(SimpleTimer);
};

SimpleTimer.prototype = {
   constructor: SimpleTimer
  // behaviors can be associated states by defining methods named for entering or exiting a specific state

  , enterOff: function (s, p, id) {
    console.log(id, 'shutting down');
  }

  , enterOn: function (s, p, id) {
    var ctr = this.fsm.counter();
    console.log(id, ctr);
    this.fsm.counter(ctr + 1);
  }
};

// this is the specification of the state machine. It is totally independent of associated behavior
SimpleTimer.config =
{
   start:   'Off'            // initial state
  ,states: ['Off', 'On']     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,io: {
      duration: fsm.numeric  // placeholder till we make timers based on variable changes
      ,counter:fsm.numeric
      ,maximum:fsm.numeric
  }

  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
       {from: '*',   to: 'Off',  evt:'stop'   }    // turn it off any time
      ,{from: '*',   to: 'On',   evt:'start'  }    // turn it on, if not already on
      ,{from: 'On',  to: 'On', timer:1000, increment:'counter'}    // once on, fire every five seconds till turned off
      ,{from: '*',   to: 'Off', when: 'counter==maximum'}  // shut off after max times
    ]
   ,options:{}
};

SimpleTimer.factorize();


describe('simpletimer test 1', function () {
  it('Instantiate an fsm', function () {
    var t1 = new SimpleTimer('t1');
    t1.fsm.maximum(10);
    t1.fsm.counter(0);
    t1.fsm.transduce('start');
    //t1.fsm.duration(1000);


  });
});


