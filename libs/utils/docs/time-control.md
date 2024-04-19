# Time Control

## Purpose:
- provide a unified model for expressing flexible (game) time controls
- provide a compact, intelligible and hopefully intuitive notation for expressing controls
- provide an intuitive clock visualization that accomodates all cases

## Our Notation
Compactly and similar to popular notation Chess time control, expanded to accommodate Go controls


### Summary of Notation
Though presented first, its more intelligible after seeing the examples below:

    [Periods *] [[reset] Moves / ] [(Delay)] [reset] Time [..Cap] [+ [..]Bonus]

    Or more succinctly:  
    
    [P *] [[r]M / ] [(D)] [r]T[..C] [+ [..]B]

### Rules and principles of the notation:
- The notation represents a configuration of the clock
- A configuration may have multiple *stages*, delimited by *commas*
    - e.g. "60m, 10/r10m" has an initial absolute stage of 60 minutes, followed by another stage
- A stage has P *periods* (default=1), expressed (when >1) as a prefix  \<Periods\> x
    - e.g. "6 x r1/60s" means 6 periods of 1 move per 60 seconds
- Loss on time on expiring the last period of the last stage
- Times always have unit suffix, recognized suffixes are *s, m, h, d*  for seconds, minutes, hours, and days
    - don't expect these to be combined à la 1d6h15m5s, just pick the largest workable unit
    - each time can have its own unit suffix
- Moves counts always precede times and are followed by /
    - defaults to * (representing unlimited number)
    - e.g. "3/60s" means 3 moves in 60 seconds
    - e.g. "*/60m" is same as just "60m", and means absolute 60 minutes for any number of moves
- Expiration of either number of moves or time may *reset* a period, as designated by an 'r' prefix on appropriate field
    - e.g. "r20/60m" 20 moves per 60 minutes, reset time to 60m when *completing 20th move* if time hasn't expired
    - e.g. "20/r60m" 20 moves per 60 minutes, reset time to 60m when *time expires* if at least 20 moves have been played
- A delay always *precedes* the allocated time and is shown as a time in parenthesis
    - effectively defaults to zero
    - delays precede the time to indicate that they are consumed first
    - delays are parenthesized to indicate that unused delays never accrue
- A time bonus (aka increment) if used, follows the time, and has a + prefix
    - bonuses follow the time to indicate they are only awarded after a move
- If the period's time can grow larger than initial configuration, it is designated with ..\[Cap\]
    - three examples all starting with 10 minutes and awarding 1 minute increments:
        - e.g. "10m..15m + 1m" total time may never exceed 15 minutes
        - e.g. "10m + 1m"  time may never exceed 10m
        - e.g. "10m.. _ 1m" time may accumulate without clipping
- If the bonus acts like a post-awarded delay (Bronstein), the bonus is denoted  "+ ..\<Cap\>"
    - e.g. "30m + ..10s" means 30 minutes, with up to 10 seconds awarded at end of move (minimum(used, bonus))


## Open Issues
+ for completeness sake allow expiring on moves in addition to time
    + this spec expires on time by default and resets on either moves or time (potentially both?)
+ is there a way to incorporate a sliding average, e.g. there may be no 10 consecutive moves consuming more than n time?
  I judge it to be unnecessarily notational and visual complication, however much I like the idea, but most time controls
  where designed to meet the time constraints of tournaments, and nothing else
+ hourglass is excluded despite being my overall favorite time control for the same reason. It contributes nothing to
  limiting time on tournaments, but is a blast for friendly games where the faster player can dictate the pace

See http://jetcitychess.org/time-controls/ for chess examples
### 
    Examples

    "60m"               Absolute: you have 60 minutes for however many moves
                        [{time:60*60}]
                        
    "r1/30s"            Simple: you have 60 min per single move, resets each time you move
                        [{time:30, moves:1, reset:'m'}]
                        
    "90m, 6 x r1/60s"   Main + Byo-Yomi: 90 minutes, then 6 periods resetting each 1 move under 60 seconds
                        [{time:60*90},{time:60, periods:6, moves:1 reset:'m'}]
                        
    "60m, r10/15m"      Main + Canadian overtime: 60 minutes, then 10 moves per 15 minutes, resetting after 10 moves
                        [{time:60*60}, {time:15*60, moves:10, reset:'m'}]
                        
    "30m.. + 3m"        Fischer: 30 minutes + 3 minute bonus awarded per move, no limit on accumulated time
                        [{time:60*60, bonus:3*60, cap:60*120}]
                        
    "40/90m+30s, 30m..+30s" FIDE tournament: 90m for first 40 moves, 30 minutes, with Fischer increment of 30 sec per move
                        [{time:60*90, moves:40, bonus:30},{time:60*30, bonus:30}]
                        
    "60m..120m + 2m"    Capped Fischer:  60 minutes + 2 minute bonus with cap of 120 minutes max time
                        [{time:60*60, bonus:2*60, cap:60*120}]
                        
    "10m + 30s"          Capped Fischer:  10 minutes + 30 second bonus, but never to exceed 10 minutes reserve time (same as "10..10m + 2m")
                        [{time:10*60, bonus:30, cap:10*60}]
                        
    "(5s) 120m"         US Delay:  5s delay per move allowing 120m
                        [{time:120m, delay:5}]
                        
    "30m + ..10s"       Bronstein:   // functionally a delay, but only added as a bonus after move, reads: 30 minutes + up to 10 seconds
                        [{time:30*60, bonus:10, cap:-1]

    "10/r5m"            Steady Average Timing                                  // Identical to standard chess moves/minutes, with a reset on time rather than moves
    
    
    "10/r5m???"         Total Average Timing                                   // fischer generified over multiple moves?
