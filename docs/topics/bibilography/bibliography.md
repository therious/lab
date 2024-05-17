# Bibliography


## Infrastructure as Code


## Domain Driven Design, Event Sourcing and CQRS
* _Domain-Driven Design: Tackling Complexity in the Heart of Software_, by Eric Evans
* _Implementing Domain-Driven Design_, by Vaughn Vernon
* [Domain Driven Design Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
  * [Annotated copy on google docs](https://docs.google.com/document/d/15wa5xl-cC01TAivoTMGObqEQjPBggQscoM7kDtFyacY)  Please read this one instead, and
    add your own comments.
* [The Dark Side of Event Sourcing: Managing Data Conversion](./dark-side-of-event-sourcing.pdf)


## Graph Databases

* [Towards_Temporal_Graph_Databases](https://ceur-ws.org/Vol-1644/paper40.pdf) Relates to the obvious real-world
observation that many relationships are temporal,
(e.g. "when were you married to x", "where did you live at this time", "who was your insurance provider at that time")
  * this paper's approach goes a bit far proliferating node types, especiall to represent temporal edges, ostensibly to
make the graph's more OLAP-friendly.

## Types of consistency

This book by Matthieu Perrin grabbed my attention, because of its thorough treatment of different types of 
consistency contracts in a concurrent system, brilliantly illustrated by the differences 
between Hangouts, Skype, and WhatsApp messaging systems.

One ideal would be to be able to present these tradeoffs in terms
anyone can understand, and allowing them to effectively "pick their poison" and roll out a system.
The alternative unwashed masses is to accidentally "choose" in an inconsistent fashion, for each component 
(and potentially their subequent refactors)/

* [One excellent CAP theorem explanation](https://www.scylladb.com/glossary/cap-theorem)
* "Distributed Systems: Concurrency and Consistency" ISTE Press 2017
 * [link on Google Books](https://www.google.com/books/edition/Distributed_Systems/8ksgDgAAQBAJ) 
 * [online presentation](./Presentation_Matthieu_PERRIN_en.pdf) ( also at https://matthieu-perrin.fr/data/Presentation_Matthieu_PERRIN_en.pdf)
 * [color diagrams for Distributed Systems](./Perrin-color-section.pdf) 
   * also online [zipfile](http://www.iste.co.uk/perrin/distributed.zip)

## State Machines and State Charts

* [XState](https://github.com/statelyai/xstate/tree/main/packages/core#readme) - a full blown state chart system


## Actor Model
* [Actors can rule your DDD world](https://www.youtube.com/watch?v=lcGf2Txq92o)  - Very high level DDD, Event Sourcing, CQRS how it fits with the actor model
* [Wide world of almost-actors: comparing Pony to BEAM languages](https://www.youtube.com/watch?v=_0m0_qtfzLs)
  * Compares a true actor model, to what Erlang/Beam provided, and how an actor model implementation was never their goal
  * Erlang/Beam were designed to solve Erickson's reliability problems, and violates the actor model
  
* [Hewitt, Meijer and Szyperski: The Actor Model](https://www.youtube.com/watch?v=7erJ1DV_Tlo) - This video gives a better 
  idea of the orthodox actor model of computation
  * be prepared to learn the difference between bounded nondeterminism and indeterminism, and how actor model is more 
    faithful to physics than algrebraic equations
  * how it differs from csp which has channels
   
## React/Redux

These just point to interesting stuff, no implied endorsement (except in removing business logic from useEffect)

* [Stop using useEffect with Redux](https://www.youtube.com/watch?v=I7g363Faxa4) 
