# Bibliography



## Domain Driven Design, Event Sourcing and CQRS
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

* "Distributed Systems: Concurrency and Consistency" ISTE Press 2017
 * [link on Google Books](https://www.google.com/books/edition/Distributed_Systems/8ksgDgAAQBAJ) 
 * [online presentation](./Presentation_Matthieu_PERRIN_en.pdf) ( also at https://matthieu-perrin.fr/data/Presentation_Matthieu_PERRIN_en.pdf)
 * [color diagrams for Distributed Systems](./Perrin-color-section.pdf) ( also online at www.iste.co.uk/perrin/distributed.zip)

## State Machines and State Charts

* [XState](https://github.com/statelyai/xstate/tree/main/packages/core#readme) - a full blown state chart system


