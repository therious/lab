import {game} from '../ticket/Game';

const soundsFanfare = [
  '/sounds/fanfare/413203__joepayne__clean-and-pompous-fanfare-trumpet.mp3',
  '/sounds/fanfare/463813__se2001__ant-fanfare-1.mp3',
  '/sounds/fanfare/513484__olver__funny-fanfare-2.wav',
  '/sounds/fanfare/524849__mc5__short-brass-fanfare-1.wav'
];

function randomRange(min:number, max:number):number { return Math.floor(Math.random() * (max - min + 1) + min); }
function randomValue<T>(arr:T[]):T                  { return arr[randomRange(0, arr.length)] }

export function playFanfare()
{
  const audio = new Audio(randomValue<string>(soundsFanfare));
  audio.play();
}


const soundsCompletedTicket = [
  '/sounds/trains/89590__cgeffex__human_human-train-whistle-vers1.mp3',
  '/sounds/trains/94216__benboncan__steam-train-1.wav',
  '/sounds/trains/170848__eliasheuninck__steam-train-horn-02.wav',
  '/sounds/trains/224002__secretmojo__blues-harmonica-train-whistles.flac',
  '/sounds/trains/170848__eliasheuninck__steam-train-horn-02.wav',
  '/sounds/trains/345905__basoap__train-whistle.wav'
];

export function playSoundCompleteTicket(turn:number)
{
  const audio = new Audio(soundsCompletedTicket[turn % soundsCompletedTicket.length])
  audio.play();
}

export function dealCardsSoundEffect(count:number, beforeAction:Function, completeAction:Function)
{
  const dealSound = new Audio('/sounds/cards/571577__el_boss__playing-card-deal-variation-1.wav')
  dealSound.playbackRate = 2.5;

  let i = 0;
  const dealOne = () =>{
    if(i < count) {
      ++i;
      beforeAction();
      dealSound.play();
      if(i >= count)
        completeAction();
    }
  };
  dealOne();
  dealSound.addEventListener('ended', dealOne);
}
export function playShuffleSound()
{
  const sound = new Audio('/sounds/cards/96130__bmaczero__shuffle.wav');
  sound.play();
}
const clicks = [
  '/sounds/clicks/202313__7778__click-2.mp3',
  '/sounds/clicks/421313__jaszunio15__click_180.wav',
  '/sounds/clicks/457455__rudmer_rotteveel__karabiner_click_03.wav',
  '/sounds/clicks/655157__bernhoftbret__clicking-4.mp3',
];
export function playClick()
{
  const sound = new Audio(randomValue<string>(clicks));
  sound.play();
}

const errors = [
  '/sounds/errors/372197__original_sound__error-bleep-4.mp3',
  '/sounds/errors/423166__plasterbrain__minimalist-sci-fi-ui-error.flac',
  '/sounds/errors/500759__xpoki__synth_error2.mp3',
  '/sounds/errors/672085__saha213131__error.mp3',
  '/sounds/errors/697442__gamer500__error.wav',
  '/sounds/errors/713179__veinadams__user-interface-beep-error-404-glitch.wav',
  '/sounds/errors/722377__qubodup__error-3.wav',
];
export function playError()
{
  const sound = new Audio(randomValue<string>(errors));
  sound.play();
}
