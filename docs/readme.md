## todos:
* remove trains when reverting state (debugging backwards)
* disable buttons when appropriate e.g. dealing five cards, dealing cards when empty, getting ticket when empty
  * this is nearly done, but not yet right
* coast to coast implemented, but 1 issue created, and another issue revealed:
 * numeric count on tickets is incorrect (multiple coast to coast tickets get the same number)
 * coast to coast tickets need special rendering, they look like the other tickets
* implement log of who did what
* Save discarded color cards to reshuffle deck when out of cards. Suggestion: just have a couple of alternately shuffled decks
waiting behind the original so there is no shortage of cards, and order determined before the game, so it cannot run out.
* Middleware to tie effects to actions (before? only after?)
* make tickets come out of a vending machine, animation that ends up at layout position for ticket. That way we eliminate the intro animation on the ticket itself, and put it on a temporary impostor, an Intro, ticket.

[Original Ticket to Ride Rules](https://ncdn0.daysofwonder.com/tickettoride/fr/img/tt_rules_2015_en.pdf)

## [ticket to ride, first journey rules](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2023/11/tk_rules_en_2018.pdf ) notes: 
* only 20 train cars can be placed by any player
* only 4 coast-to-coast bonus tickets can be awarded
* not allowed to claim both of pair of parallel routes (little kid friendly rule?)
* you are allowed to discard both open tickets to get two alternate tickets on your turn
* alternate ending is placing the your last train on the board (20th train car), whoever has most completed tickets wins
