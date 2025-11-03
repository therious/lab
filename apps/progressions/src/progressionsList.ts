import { ChordProgression } from './types';

export const progressionsData: ChordProgression[] = [
  {
    n: 37,
    name: "Thinking Out Loud",
    progression: ["I", "I-III", "IV", "V"],
    songs: ["Thinking Out Loud (Ed Sheeran) [D, 79]"],
    key: "D"
  },
  {
    name: "I-♭VII-IV",
    progression: ["I", "♭VII", "IV"],
    songs: ["Sweet Child O' Mine (Guns N' Roses) [G, 120]", "Sweet Home Alabama (Lynyrd Skynyrd) [G, 100]", "All Along the Watchtower (Bob Dylan/Jimi Hendrix) [C, 120]", "Horse with No Name (America) [Am, 90]"],
    key: "G"
  },
  {
    n: 31,
    name: "Kiss from a Rose",
    progression: ["♭VI", "♭VII", "I"],
    songs: ["Kiss from a Rose (Seal) [G, 96]", "Crazy Little Thing Called Love (Queen) [G, 120]"],
    key: "G"
  },
  {
    n: 24,
    name: "Luka",
    progression: ["I", "V", "IV", "V"],
    songs: ["Livin' On A Prayer (Bon Jovi) [G, 122]", "She Loves You (The Beatles) [G, 150]", "There She Goes (The La's) [C, 120]", "Luka (Suzanne Vega) [C, 90]", "Tangerine (Led Zeppelin) [C, 120]", "MMMBop (Hanson) [C, 100]", "Heaven is a Place on Earth (Belinda Carlisle) [C, 120]"],
    key: "C"
  },
  {
    name: "I-V-IV-V (with variation)",
    progression: ["I", "V", "IV", "V"],
    songs: ["Livin' On A Prayer (Bon Jovi) [G, 122]", "She Loves You (The Beatles) [G, 150]", "Tangerine (Led Zeppelin) [C, 120]"],
    key: "C"
  },
  {
    n: 15,
    name: "Royal Road progression",
    progression: ["IV", "V", "iii", "vi"],
    songs: ["Favored in japan"],
    key: "F"
  },
  {
    n: 30,
    name: "Air that I breath",
    progression: ["I", "III", "IV-iv", "I"],
    songs: ["The Air That I Breathe (The Hollies) [G, 72]", "Creep (Radiohead) - variation [G, 92]"],
    key: "G"
  },
  {
    n: 20,
    name: "Andalusian Cadence",
    progression: ["i", "♭VII", "♭VI", "V"],
    songs: ["Hit the Road Jack (Ray Charles) [Am, 144]", "Good Vibrations (The Beach Boys) [Am, 120]", "Citizen Erased (Muse) [Am, 100]", "Summer in the City (The Lovin' Spoonful) [Am, 120]", "Happy Together (The Turtles) [Am, 120]", "Runaway (Del Shannon) [Am, 120]", "Smooth Criminal (Michael Jackson) [Am, 118]", "Stairway to Heaven (Led Zeppelin) - variation [Am, 63]"],
    key: "Am"
  },
  {
    name: "Andalusian Cadence (with 7th)",
    progression: ["i", "♭VII7", "♭VI", "V"],
    songs: ["Stairway to Heaven (Led Zeppelin) [Am, 63]"],
    key: "Am"
  },
  {
    n: 21,
    name: "Aeolian Valley",
    progression: ["i", "♭VII", "♭VI", "♭VII"],
    songs: ["White Wedding (Billy Idol) [Am, 140]", "Running Up That Hill (Kate Bush) [Am, 108]", "Rolling in the Deep (Adele) [Am, 105]", "All Along the Watchtower (Bob Dylan/Jimi Hendrix) [Am, 120]", "Stairway to Heaven (Led Zeppelin) [Am, 63]", "My Heart Will Go On (Celine Dion) [Am, 67]", "In the Air Tonight (Phil Collins) [Am, 90]", "The Sound of Silence (Simon & Garfunkel) [Am, 69]"],
    key: "Am"
  },
  {
    n: 16,
    name: "Axis Progression",
    progression: ["I", "V", "vi", "IV"],
    songs: ["Let It Be (The Beatles) [C, 72]", "Don't Stop Believin' (Journey) [E, 122]", "With or Without You (U2) [D, 110]", "Can You Feel the Love Tonight (Elton John) [D♭, 80]", "Let It Go (Idina Menzel) [F, 120]", "Someone Like You (Adele) [A, 67]", "No Woman No Cry (Bob Marley) [C, 80]", "She Will Be Loved (Maroon 5) [A, 95]", "Perfect (Ed Sheeran) [G, 95]", "I'm Yours (Jason Mraz) [B, 151]", "Paparazzi (Lady Gaga) [Am, 112]", "Torn (Natalie Imbruglia) [Am, 164]", "Under the Bridge (Red Hot Chili Peppers) [Bm, 84]"],
    key: "C"
  },
  {
    n: 18,
    name: "Axis Rotations",
    progression: ["vi", "IV", "I", "V"],
    songs: ["Complicated (Avril Lavigne) [Am, 120]", "Paparazzi (Lady Gaga) [Am, 112]", "Californication (Red Hot Chili Peppers) [Bm, 95]", "Ani Maamin (TAI) [Am]", "Africa (Toto) [Am, 92]", "River Flows in You (Yiruma) [Am, 80]", "Numb (Linkin Park) [Am, 90]", "Kids (MGMT) [Am, 120]", "San Francisco (Scott McKenzie) [Am, 110]", "Apologize (OneRepublic) [Am, 90]", "Demons (Imagine Dragons) [Am, 100]", "Love The Way You Lie (Eminem ft. Rihanna) [Am, 87]", "If I Were a Boy (Beyoncé) [Am, 90]", "Save Tonight (Eagle-Eye Cherry) [Am, 120]", "The Spectre (Alan Walker) [Am, 128]"],
    key: "Am"
  },
  {
    name: "Axis Rotations (unequal bar length)",
    progression: ["vi", "IV", "I", "V"],
    songs: ["Apologize (OneRepublic) [Am, 90]", "Someone Like You (Adele) [Am, 67]"],
    key: "Am"
  },
  {
    n: 19,
    name: "Axis Rotations",
    progression: ["IV", "I", "Vi", "vi"],
    songs: ["Paparazzi (Lady Gaga) - variation [F, 112]"],
    key: "F"
  },
  {
    n: 17,
    name: "Axis Rotations",
    progression: ["V", "vi", "IV", "I"],
    songs: ["Complicated (Avril Lavigne) - variation [G, 120]", "Paparazzi (Lady Gaga) - variation [G, 112]"],
    key: "G"
  },
  {
    n: 23,
    name: "Blue Moon",
    progression: ["I", "vi", "ii", "V"],
    songs: ["Blue Moon (Richard Rodgers) [C, 60]", "All of Me (John Legend) [C, 120]", "Heart and Soul (Hoagy Carmichael) [C, 120]", "I Will Always Love You (Dolly Parton/Whitney Houston) [C, 70]"],
    key: "C"
  },
  {
    name: "Blue Moon (with 7th)",
    progression: ["I", "vi", "ii7", "V7"],
    songs: ["Autumn Leaves (Joseph Kosma) [C, 120]", "All the Things You Are (Jerome Kern) [C, 100]", "Blue Bossa (Kenny Dorham) [C, 120]"],
    key: "C"
  },
  {
    n: 28,
    name: "Creep",
    progression: ["I", "III", "IV", "iv"],
    songs: ["Creep (Radiohead) [G, 92]", "That's When Your Heartaches Begin (The Ink Spots) [G, 80]"],
    key: "G"
  },
  {
    name: "Creep (with 7th)",
    progression: ["I", "III", "IV7", "iv"],
    songs: ["Creep (Radiohead) - variation [G, 92]"],
    key: "G"
  },
  {
    n: 35,
    name: "Don't Worry, Be Happy",
    progression: ["I", "III", "IV", "I"],
    songs: ["What's Up (4 Non Blondes) [D, 110]", "To Love Somebody (Bee Gees) [C, 120]", "Don't Worry Be Happy (Bobby McFerrin) [C, 120]", "BulletProof (La Roux) [C, 120]", "Marry You (Bruno Mars) [C, 120]"],
    key: "C"
  },
  {
    n: 22,
    name: "Doo Wop",
    progression: ["I", "vi", "IV", "V"],
    songs: ["Stand By Me (Ben E. King) [C, 120]", "Where Have All The Flowers Gone (Pete Seeger) [C, 120]", "Earth Angel (The Penguins) [C, 80]", "I Will Always Love You (Dolly Parton/Whitney Houston) [C, 70]", "Crocodile Rock (Elton John) [C, 140]", "Happiness is a Warm Gun (The Beatles) [C, 120]", "Every Breath You Take (The Police) [C, 117]", "Unchained Melody (The Righteous Brothers) [C, 80]", "Beautiful Girls (Sean Kingston) [C, 120]"],
    key: "C"
  },
  {
    name: "Doo Wop (with 7th)",
    progression: ["I", "vi", "IV", "V7"],
    songs: ["Stand By Me (Ben E. King) - variation [C, 120]", "Earth Angel (The Penguins) - variation [C, 80]"],
    key: "C"
  },
  {
    n: 6,
    name: "Give me Love",
    progression: ["I", "I°7", "I7", "IV7"],
    songs: ["Give me Love (George Harrison) [C, 120]"],
    key: "C"
  },
  {
    n: 4,
    name: "Hello (Adele)",
    progression: ["i", "♭III", "♭VII", "♭VI"],
    songs: ["Hello (Adele) [Fm, 120]", "Rolling in the Deep (Adele) - variation [Fm, 105]"],
    key: "Fm"
  },
  {
    name: "I-♭VI-IV-I",
    progression: ["I", "♭VI", "IV", "I"],
    songs: ["Creep (Radiohead) [C, 92]", "No Surprises (Radiohead) [C, 90]"],
    key: "C"
  },
  {
    name: "I-ii-vi-V",
    progression: ["I", "ii", "vi", "V"],
    songs: ["Photograph (Ed Sheeran) [C, 120]", "Sugar (Maroon 5) [C, 120]"],
    key: "C"
  },
  {
    name: "I-IV-V-IV",
    progression: ["I", "IV", "V", "IV"],
    songs: ["Sweet Caroline (Neil Diamond) [C, 120]", "La Bamba (Ritchie Valens) [C, 160]", "Louie Louie (The Kingsmen) [C, 120]", "Wild Thing (The Troggs) [C, 120]", "Twist and Shout (The Beatles) [C, 120]"],
    key: "C"
  },
  {
    name: "I-IV-V-IV (unequal bar length)",
    progression: ["I", "IV", "V", "IV"],
    songs: ["Sweet Caroline (Neil Diamond) - variation [C, 120]"],
    key: "C"
  },
  {
    name: "I-IV-vi-V",
    progression: ["I", "IV", "vi", "V"],
    songs: ["Hey Jude (The Beatles) [C, 72]", "All of Me (John Legend) [C, 120]", "Halo (Beyoncé) [C, 120]"],
    key: "C"
  },
  {
    name: "I-V-I-V",
    progression: ["I", "V", "I", "V"],
    songs: ["Blitzkrieg Bop (Ramones) [C, 180]", "Take on Me (A-ha) [C, 170]"],
    key: "C"
  },
  {
    name: "IV-I-V-vi",
    progression: ["IV", "I", "V", "vi"],
    songs: ["Perfect (Ed Sheeran) [G, 95]", "Closer (The Chainsmokers) [C, 95]"],
    key: "C"
  },
  {
    n: 3,
    name: "Jolene",
    progression: ["i", "♭III", "♭VII", "i"],
    songs: ["Jolene (Dolly Parton) [Am, 120]", "Time (Pink Floyd) [Am, 120]", "I Bet You Look Good on the Dancefloor (Arctic Monkeys) [Am, 120]", "Fools Gold (The Stone Roses) [Am, 120]"],
    key: "Am"
  },
  {
    n: 36,
    name: "Let's Get it On",
    progression: ["I", "iii", "IV", "V"],
    songs: ["Let's Get It On (Marvin Gaye) [C, 80]", "Make Your Own Kind of Music (Mama Cass Elliott) [C, 120]", "Knowing Me, Knowing You (ABBA) [C, 120]", "I Can Hear Music (The Beach Boys) [C, 120]"],
    key: "C"
  },
  {
    name: "Let's Get it On (with 7th)",
    progression: ["I", "iii", "IV", "V7"],
    songs: ["Let's Get It On (Marvin Gaye) - variation [C, 80]"],
    key: "C"
  },
  {
    n: 25,
    name: "Mixolydian Vamp",
    progression: ["I", "♭VII", "IV", "I"],
    songs: ["Hey Jude (The Beatles) - chorus [C, 72]", "Royals (Lorde) [C, 120]", "Freedom (George Michael) [C, 120]", "Sweet Home Alabama (Lynyrd Skynyrd) [C, 100]", "One Day Like This (Elbow) [C, 120]", "Sympathy for the Devil (The Rolling Stones) [C, 120]", "Sweet Child O' Mine (Guns N' Roses) [C, 120]"],
    key: "C"
  },
  {
    name: "Mixolydian Vamp (with 7th)",
    progression: ["I", "♭VII7", "IV", "I"],
    songs: ["Hey Jude (The Beatles) - chorus variation [C, 72]", "Sympathy for the Devil (The Rolling Stones) - variation [C, 120]"],
    key: "C"
  },
  {
    n: 34,
    name: "Saturday in the Park",
    progression: ["vi", "III", "V", "I"],
    songs: ["Saturday in the Park (Chicago) [Am, 120]", "Back on the Road (Earth, Wind & Fire) [Am, 120]", "Daughters (John Mayer) [Am, 120]", "Don't Know Why (Norah Jones) [Am, 90]", "Isn't She Lovely (Stevie Wonder) [Am, 120]"],
    key: "Am"
  },
  {
    n: 1,
    name: "She loves you",
    progression: ["I", "vi", "iii", "V"],
    songs: ["She Loves You (The Beatles) [C, 150]", "Girl on Fire (Alicia Keys) [C, 120]", "You Got It (Roy Orbison) [C, 120]", "She Wolf (Shakira) [C, 120]", "Valentine's Day (Linkin Park) [C, 120]", "Old Money (Lana Del Rey) [C, 120]", "Turn Into (Yeah Yeah Yeahs) [C, 120]", "When You're Gone (The Cranberries) [C, 120]"],
    key: "C"
  },
  {
    n: 5,
    name: "Something (Beatles)",
    progression: ["I", "I°7", "I7", "IV"],
    songs: ["Something (The Beatles) [C, 120]", "Something More (Train) [C, 120]", "Raindrops Keep Fallin' on My Head (B.J. Thomas) [C, 120]", "Everything's Not Lost (Coldplay) [C, 120]", "Strawberry Swing (Coldplay) [C, 120]", "Remember Me (Diana Ross) [C, 120]", "Love is a Game (Adele) [C, 120]", "Rollerblades (Eliza Doolittle) [C, 120]"],
    key: "C"
  },
  {
    n: 29,
    name: "Space Oddity",
    progression: ["I", "III", "IV", "iv - I"],
    songs: ["Space Oddity (David Bowie) [G, 120]", "Creep (Radiohead) - variation [G, 92]"],
    key: "G"
  },
  {
    n: 2,
    name: "Starlight",
    progression: ["I", "ii", "vi", "IV"],
    songs: ["Starlight (Muse) [C, 120]", "Delicate (Taylor Swift) [C, 120]", "Halo (Beyoncé) [C, 120]"],
    key: "C"
  },
  {
    n: 32,
    name: "Steppin Out",
    progression: ["♭VI", "♭VII", "I", "I"],
    songs: ["Steppin' Out (Joe Jackson) [C, 120]", "Hallucinate (Dua Lipa) [C, 120]", "All I Wanna Do (Sheryl Crow) [C, 120]"],
    key: "C"
  },
  {
    n: 33,
    name: "Super Mario",
    progression: ["I", "♭VI", "♭VII", "I"],
    songs: ["Super Mario Bros Theme (Koji Kondo) [C, 150]", "Under the Bridge (Red Hot Chili Peppers) - variation [C, 84]", "No Surprises (Radiohead) - variation [C, 90]"],
    key: "C"
  },
  {
    name: "vi-I-IV-V",
    progression: ["vi", "I", "IV", "V"],
    songs: ["Someone Like You (Adele) [Am, 67]", "Rolling in the Deep (Adele) [Am, 105]"],
    key: "Am"
  },
  {
    name: "vi-ii-V-I",
    progression: ["vi", "ii", "V", "I"],
    songs: ["Autumn Leaves (Joseph Kosma) [Am, 120]", "The Girl from Ipanema (Antônio Carlos Jobim) [Am, 120]", "Blue Bossa (Kenny Dorham) [Am, 120]", "All the Things You Are (Jerome Kern) [Am, 100]"],
    key: "Am"
  },
  {
    name: "vi-ii-V-I (with 7th)",
    progression: ["vi7", "ii7", "V7", "I"],
    songs: ["Autumn Leaves (Joseph Kosma) - variation [Am, 120]", "The Girl from Ipanema (Antônio Carlos Jobim) - variation [Am, 120]"],
    key: "Am"
  },
  {
    n: 7,
    name: "Full Something",
    progression: ["I", "I°7", "I7", "IV", "iv"],
    songs: ["Something (The Beatles) - extended variation [C, 120]"],
    key: "C"
  },
  {
    n: 8,
    name: "It ain't over",
    progression: ["I", "I°7", "I9", "IV", "iv"],
    songs: ["It Ain't Over Till It's Over (Lenny Kravitz) [C, 120]"],
    key: "C"
  },
  {
    n: 26,
    name: "Joan of Arc",
    progression: ["I", "V", "IV", "V-V", "V"],
    songs: ["Joan of Arc (Leonard Cohen) [G, 120]"],
    key: "G"
  },
  {
    n: 14,
    name: "Hallelujah",
    progression: ["I", "IV", "V", "iv", "IV", "?"],
    songs: ["Hallelujah (Leonard Cohen) [C, 60]", "It goes like this, the fourth (IV), the fifth (V), the minor fall (iv) the major Lift (IV) \"Word painting\" [C]"],
    key: "C"
  },
  {
    n: 9,
    name: "Can't take my eyes off of you",
    progression: ["I", "I°7", "I7", "IV", "iv", "I", "II7 - ii7"],
    songs: ["Can't Take My Eyes Off You (Frankie Valli) [C, 120]"],
    key: "C"
  },
  {
    n: 13,
    name: "I was only joking (Rod Stewart)",
    progression: ["I", "I°7", "I7", "IV", "iv", "I", "V"],
    songs: ["I Was Only Joking (Rod Stewart) [A, 120]"],
    key: "A"
  },
  {
    n: 10,
    name: "Salt Walter",
    progression: ["I", "I°7", "I7", "IV", "iv", "I-vi", "♭VI - ♭VII"],
    songs: ["Saltwater (Julian Lennon) [E, 120]"],
    key: "E"
  },
  {
    n: 11,
    name: "Simple Twist of Fate",
    progression: ["I", "I°7", "I7", "IV", "iv", "I - V - iv", "I V7"],
    songs: ["Simple Twist of Fate (Bob Dylan) [E, 120]"],
    key: "E"
  },
  {
    name: "I-V-vi-iii-IV-I-IV-V",
    progression: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    songs: ["Pachelbel's Canon in D (Johann Pachelbel) [D, 120]", "Greensleeves (Traditional) [D, 120]", "Basket Case (Green Day) [D, 189]", "Don't Look Back in Anger (Oasis) [D, 120]", "Memories (Maroon 5) [D, 120]"],
    key: "D"
  },
  {
    name: "Pachelbel's Canon (variation)",
    progression: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    songs: ["Canon in D (Johann Pachelbel) [D, 120]", "Basket Case (Green Day) [D, 189]", "Don't Look Back in Anger (Oasis) [D, 120]", "Memories (Maroon 5) [D, 120]"],
    key: "D"
  },
  {
    n: 12,
    name: "If a picture (Bread)",
    progression: ["I", "I°7", "I7", "IV", "iv", "I", "v6", "V7"],
    songs: ["If a Picture Paints a Thousand Words (Bread) [A, 120]"],
    key: "A"
  },
  {
    name: "vi-IV-I-V-vi-IV-I-V",
    progression: ["vi", "IV", "I", "V", "vi", "IV", "I", "V"],
    songs: ["Don't Look Back in Anger (Oasis) [Am, 120]", "Wonderwall (Oasis) [Am, 120]"],
    key: "Am"
  },
  {
    name: "Wonderwall progression",
    progression: ["vi", "IV", "I", "V"],
    songs: ["Wonderwall (Oasis) [Am, 120]", "Don't Look Back in Anger (Oasis) [Am, 120]"],
    key: "Am"
  },
  {
    n: 27,
    name: "Sisters of Mercy",
    progression: ["I", "IV", "I", "V", "iii", "vii", "iii", "vii", "V", "V", "V", "IV", "I", "♭VII", "vi", "V", "V", "V", "I", "IV", "I", "V", "I"],
    songs: ["Sisters of Mercy (Leonard Cohen) [A, 120]"],
    key: "A"
  },
  {
    name: "Magnolia",
    progression: ["I", "I°7", "I7", "IV", "iv"],
    songs: ["Magical Mystery Tour (The Beatles) [C, 120]", "Magnolia's Wedding Day [C]", "My Mother's Eyes [C]", "When the Saints Go Marching In (Traditional) [C, 120]", "The Lonesome Road [C]", "If I Had You [C]"],
    key: "C"
  },
  {
    name: "I-IV-V (Three Chord Song)",
    progression: ["I", "IV", "V"],
    songs: ["Twist and Shout (The Beatles) [C, 120]", "La Bamba (Ritchie Valens) [C, 160]", "Wild Thing (The Troggs) [C, 120]", "Johnny B. Goode (Chuck Berry) [C, 168]", "Hound Dog (Elvis Presley) [C, 120]", "Louie Louie (The Kingsmen) [C, 120]", "Pride and Joy (Stevie Ray Vaughan) [C, 120]"],
    key: "C"
  },
  {
    name: "I-IV-V (with 7th)",
    progression: ["I7", "IV7", "V7"],
    songs: ["Johnny B. Goode (Chuck Berry) - variation [C, 168]", "Hound Dog (Elvis Presley) - variation [C, 120]"],
    key: "C"
  },
  {
    name: "ii-V-I (Jazz Standard)",
    progression: ["ii", "V", "I"],
    songs: ["Autumn Leaves (Joseph Kosma) [C, 120]", "All the Things You Are (Jerome Kern) [C, 100]", "Blue Bossa (Kenny Dorham) [C, 120]", "Giant Steps (John Coltrane) [C, 120]"],
    key: "C"
  },
  {
    name: "ii-V-I (with 7th)",
    progression: ["ii7", "V7", "Imaj7"],
    songs: ["Autumn Leaves (Joseph Kosma) - variation [C, 120]", "All the Things You Are (Jerome Kern) - variation [C, 100]", "Blue Bossa (Kenny Dorham) - variation [C, 120]"],
    key: "C"
  },
  {
    name: "I-vi-IV-V (50s Progression - extended)",
    progression: ["I", "vi", "IV", "V"],
    songs: ["Stand By Me (Ben E. King) [C, 120]", "Earth Angel (The Penguins) [C, 80]", "Unchained Melody (The Righteous Brothers) [C, 80]", "Every Breath You Take (The Police) [C, 117]", "Beautiful Girls (Sean Kingston) [C, 120]", "Where Have All The Flowers Gone (Pete Seeger) [C, 120]"],
    key: "C"
  },
  {
    name: "vi-IV-I-V (Extended)",
    progression: ["vi", "IV", "I", "V"],
    songs: ["Apologize (OneRepublic) [Am, 90]", "Numb (Linkin Park) [Am, 90]", "Cheap Thrills (Sia) [Am, 120]", "Love The Way You Lie (Eminem ft. Rihanna) [Am, 87]", "Demons (Imagine Dragons) [Am, 100]", "If I Were a Boy (Beyoncé) [Am, 90]", "Save Tonight (Eagle-Eye Cherry) [Am, 120]", "The Spectre (Alan Walker) [Am, 128]", "Someone Like You (Adele) [Am, 67]", "Rolling in the Deep (Adele) [Am, 105]"],
    key: "Am"
  }
];
