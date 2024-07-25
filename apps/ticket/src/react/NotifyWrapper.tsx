import React, {useEffect, useCallback} from "react";
import {SnackbarAction, useSnackbar, VariantType} from "notistack";
import {actions, useSelector} from '../actions-integration';
import {NotifyState, Notice} from '@therious/actions'
import {NeueModal} from '@therious/components';
import {Btn} from './Btn';

const displayed: Record<Notice['key'],Notice> = {};

const snackable = ({remedy, key}:Notice) => remedy === 'Review' && !displayed[key];

const levelToSnackbarVariant = (level:Notice['level']):VariantType => {
  // being typescript, we know everything is mapped and no cases are missing
  switch (level) {
    case 'info':  return level;
    case 'error': return level;
    case 'warn':  return 'warning';
    case 'fatal': return 'error';
  }
}
// dedicated to display of subset of notices we deem should go to Notistack, for now the filter is the dismiss remedy
export const NotifyWrapper = () => {
  const {notices}  = useSelector<NotifyState>((s:any)=>s.notify );  // todo change from DefaultRootState to correct state

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const dismiss = useCallback((key:Notice['key']) => actions.notify.dismiss(key),[]);

  useEffect(() => {

    const notifierAction = (key:Notice['key']) =><Btn onClick={() =>closeSnackbar(key)}>Dismiss</Btn>

    // reduce right processes items in reverse order
    notices.filter(snackable).reduceRight(
      (_:unknown, notice:Notice) => {
        const {level, key, msg}  = notice;
        const variant = levelToSnackbarVariant(level);
        enqueueSnackbar(msg, {
          key, variant, action: notifierAction as unknown as SnackbarAction,
          onExited: (event, key) => {
            actions.notify.dismiss(key);           // action removes it from list
            delete displayed[key];  // from local tracking too (if necessary--  doubt it)
          },
        });
        // }
        displayed[key] = notice;   // keep track of snackbars that we've displayed --- why?
      }
      ,null );

  }, [notices, closeSnackbar, enqueueSnackbar]);

  const fatalNotice = notices?.[0]?.level === 'fatal'? notices[0] : undefined;
  const modalNotice = !fatalNotice && notices.find(({ remedy }) => remedy === 'Dismiss');

  return fatalNotice? <NeueModal openIt={true} close={()=>{}}>{fatalNotice.msg}</NeueModal>:
         modalNotice? <NeueModal openIt={true} close={()=>{dismiss(modalNotice.key)}}>
        <div>
          <h1>{modalNotice.level}</h1>
          <hr/>{modalNotice.msg}
          <hr/><Btn onClick={()=>dismiss(modalNotice.key)}>Dismiss</Btn></div>
      </NeueModal> :
      null;
}
