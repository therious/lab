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
* add statemachine to do stuff like encoding the rules

[Original Ticket to Ride Rules](https://ncdn0.daysofwonder.com/tickettoride/fr/img/tt_rules_2015_en.pdf)
* different topology
* 144 color cards color cards are 8 purple white blue, yellow, orange, black, red, green, wild
  * 12 each of box, passenger, tanker, reefer, freight, hopper, coal, cabbose
  * 14 locomotives (wild)
* 45 train cars for each player color: blue, red, green, yellow, black
* 2 or 3 players, playing one route CLOSES the parallel route
* more players same player still not allowed to claim parallel routes
* score points completing routes
* lose points holding uncompleted routes
* draw 3 destinations from deck, must keep at least one of them (discard allowed to not be caught holding too many?)
* grey routes may be claimed with any color train cards!
* point scoring table
  * 1 pt for cost 1
  * 2 points to cost 2
  * 4 points for cost 3
  * 7 points for cost 4
  * 10 points for cost 5
  * 15 points for cost 6!
* always draw 3 cards and keep at least one when drawing destination cards
* each ticket lists an amount of points awarded for completing ticket
* game ends after first player is down to 2 or fewer train car markers to place, from that point each player gets one more turn
* players reveal completing destinations only at end of game
* player with longest continuous path get a 10 point bonus
* winner has most points, if points tied, more destinations completed is a tie-breaker, last tie-breaker is having the longest path
* tied players for longest continuous path both get bonus
* subtract points for holding uncompleted destinations (face value on the ticket)

## [ticket to ride, first journey rules](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2023/11/tk_rules_en_2018.pdf ) notes: 
* only 20 train cars can be placed by any player
* only 4 coast-to-coast bonus tickets can be awarded
* not allowed to claim both of pair of parallel routes (little kid friendly rule?)
* you are allowed to discard both open tickets to get two alternate tickets on your turn
* alternate ending is placing the your last train on the board (20th train car), whoever has most completed tickets wins
