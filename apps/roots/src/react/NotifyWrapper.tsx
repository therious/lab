import React, {useEffect} from "react";
import {SnackbarAction, useSnackbar, VariantType} from "notistack";
import {actions, useSelector} from '../actions-integration';
import {NotifyState, Notice} from '@therious/actions'
import {Btn} from './Btn';

// adapting from Humza, recall items that we have on display
const displayed: Record<Notice['key'],Notice> = {};

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
  const notify:NotifyState = useSelector((s:any)=>s.notify );  // todo change from DefaultRootState to correct state

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {

    const {notices} = notify;

    const notifierAction = (key:Notice['key']) =><Btn onClick={() => closeSnackbar(key)}>Dismiss</Btn>

    // reduce right processes items in reverse order
      notices.filter(({remedy,key})=>remedy === 'Acknowledge' && !displayed[key]).reduceRight(
        (_:unknown, notice:Notice) => {
          const {level, key, msg}  = notice;
          const variant = levelToSnackbarVariant(level);
            // @ts-ignore
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

  }, [notify, closeSnackbar, enqueueSnackbar]);

  return null;
}
