todos:
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
