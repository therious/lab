const errorSounds:string[]   = Object.values(import.meta.glob('../sounds/errors/*',  {query: '?url', import: 'default', eager: true}));
const fanfareSounds:string[] = Object.values(import.meta.glob('../sounds/fanfare/*', {query: '?url', import: 'default', eager: true}));
const ticketSounds:string[]  = Object.values(import.meta.glob('../sounds/trains/*',  {query: '?url', import: 'default', eager: true}));
const clickSounds:string[]   = Object.values(import.meta.glob('../sounds/clicks/*',  {query: '?url', import: 'default', eager: true}));
const vendSounds:string[]    = Object.values(import.meta.glob('../sounds/vend/*',    {query: '?url', import: 'default', eager: true}));


function randomRange(min:number, max:number):number { return Math.floor(Math.random() * (max - min + 1) + min); }
function randomValue<T>(arr:T[]):T                  { return arr[randomRange(0, arr.length-1)] }

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
export async function playShuffleSound():Promise<void>
{
  const sound = new Audio('/sounds/cards/96130__bmaczero__shuffle.wav');
  return sound.play();
}

function genRandomSoundPlayer(soundUrls:string[]):()=>Promise<void>
{
  return async ()=>{
    const sound = randomValue<string>(soundUrls);
    const audio = new Audio(sound);
    return audio.play();
  }
}
export const playClick = genRandomSoundPlayer(clickSounds);
export const playError = genRandomSoundPlayer(errorSounds);
export const playFanfare = genRandomSoundPlayer(fanfareSounds);
export const playSoundCompleteTicket = genRandomSoundPlayer(ticketSounds);
export const playVend = genRandomSoundPlayer(vendSounds);

