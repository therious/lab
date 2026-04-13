import { useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled, { createGlobalStyle } from 'styled-components';
import { HSplit, VSplit } from './SplitPane';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { UserProfile, INACTIVITY_TIMEOUT_MS, STATUS_REFRESH_INTERVAL_MS } from '../actions/users-slice';
import { chatId } from '../actions/chat-slice';
import { MyGrid } from './MyGrid';
import { Chat } from './Chat';
import { hashColor } from './avatar-utils';

// ── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
`;

const PageHeader = styled.h3`
  margin: 0 0 8px;
  flex-shrink: 0;
`;

const SplitFill = styled.div`
  flex: 1;
  min-height: 0;
`;

const GroupChatsPlaceholder = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 13px;
  font-style: italic;
  border: 1px dashed #dadce0;
  border-radius: 4px;
`;

// ── Column defs ───────────────────────────────────────────────────────────────

const AvatarCell = ({ value, data }: any) => {
  if (value) {
    return <img src={value} referrerPolicy="no-referrer" loading="lazy"
      style={{ width: 28, height: 28, borderRadius: '50%', verticalAlign: 'middle', marginTop: 2 }} />;
  }
  const initial = ((data?.displayName ?? data?.email ?? '?') as string)[0].toUpperCase();
  const bg      = hashColor(data?.email ?? '');
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 2,
      fontStyle: 'normal' }}>
      {initial}
    </div>
  );
};

const OnlineCell = ({ value, data }: any) => {
  let bg = '#dadce0'; // offline
  if (value) {
    const idle = data?.lastSeen && (Date.now() - data.lastSeen) > INACTIVITY_TIMEOUT_MS;
    bg = idle ? '#f9a825' : '#34a853'; // amber = idle, green = active
  }
  return <div style={{ width: 10, height: 10, borderRadius: '50%', margin: '9px auto 0', background: bg }} />;
};

const lastSeenFmt = (p: any) => p.value ? new Date(p.value).toLocaleString() : '—';
const lastSeenCmp = (a: number, b: number) => (a ?? 0) - (b ?? 0);

const columnDefs = [
  { headerName: '',          field: 'photoURL',    width: 44,  cellRenderer: AvatarCell, sortable: false },
  { headerName: '',          field: 'isOnline',    width: 32,  cellRenderer: OnlineCell, sortable: false },
  { headerName: 'Name',      field: 'displayName', flex: 1,    sortable: true, filter: true },
  { headerName: 'Email',     field: 'email',       flex: 2,    sortable: true, filter: true },
  { headerName: 'Last Seen', field: 'lastSeen',    flex: 1,    minWidth: 160,  sortable: true,
    valueFormatter: lastSeenFmt, comparator: lastSeenCmp },
];

const gridStyle = { flex: 1, width: '100%' } as React.CSSProperties;

const GridGlobalStyle = createGlobalStyle`
  .ag-theme-balham .ag-row.user-self   { font-style: italic; color: #888; }
  .ag-theme-balham .ag-row.user-unread { font-weight: bold; }
`;

// ── Component ────────────────────────────────────────────────────────────────

type Props = { session: User };

export const UsersView = ({ session }: Props) => {
  const users      = useSelector(s => s.users.list);
  const unread     = useSelector(s => s.chat.unread);
  const me         = useSelector(s => s.chat.me);
  const gridApiRef = useRef<any>(null);

  // Periodically force-refresh the online dot column so colour reflects elapsed time
  // even when row data has not changed in Firestore.
  useEffect(() => {
    const id = setInterval(() => {
      gridApiRef.current?.refreshCells({ columns: ['isOnline'], force: true });
    }, STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Firestore listener: keep the users list fresh
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      actions.users.setUsers(snap.docs.map(d => {
        const r = d.data();
        return {
          uid:         r.uid         ?? '',
          email:       r.email       ?? '',
          displayName: r.displayName ?? r.email ?? '',
          photoURL:    r.photoURL    ?? null,
          lastSeen:    (r.lastSeen as Timestamp | null)?.toMillis() ?? null,
          isOnline:    r.isOnline    ?? false,
        } as UserProfile;
      }));
    });
    return unsub;
  }, []);

  // Background listeners: one per other user so incoming messages are detected
  // even when that conversation is not open. Re-runs only when the set of UIDs changes,
  // not on every lastSeen heartbeat.
  const otherUidKey = users
    .filter(u => u.uid !== me?.uid)
    .map(u => u.uid)
    .sort()
    .join(',');

  useEffect(() => {
    if (!me?.uid || !otherUidKey) return;
    const since  = Timestamp.now();
    const others = users.filter(u => u.uid !== me.uid);
    const unsubs = others.map(user => {
      const convoId = chatId(me.uid, user.uid);
      const q = query(
        collection(db, 'chats', convoId, 'messages'),
        orderBy('timestamp', 'asc'),
        where('timestamp', '>', since),
      );
      return onSnapshot(q, snap =>
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const d = change.doc.data();
          if (d.from === me.uid) return;
          actions.chat.messageReceived(user.email, {
            fromUid:   d.from      ?? '',
            fromEmail: d.fromEmail ?? '',
            text:      d.text      ?? '',
            timestamp: d.timestamp?.toMillis() ?? Date.now(),
          });
        })
      );
    });
    return () => unsubs.forEach(u => u());
  }, [otherUidKey, me?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowClassRules = useMemo(() => ({
    'user-self':   (p: any) => p.data?.uid === session.uid,
    'user-unread': (p: any) => !!unread[p.data?.email],
  }), [session.uid, unread]);

  const isRowSelectable = useCallback((node: any) => node.data?.uid !== session.uid, [session.uid]);

  const onRowClicked = useCallback((event: any) => {
    const user = event.data as UserProfile;
    if (user && user.uid !== session.uid) {
      actions.chat.chatWith(user);
    }
  }, [session.uid]);

  const leftPane = (
    <VSplit
      defaultSize={62}
      first={
        <MyGrid
          style={gridStyle}
          rowData={users}
          columnDefs={columnDefs}
          onRowClicked={onRowClicked}
          rowSelection="single"
          isRowSelectable={isRowSelectable}
          rowClassRules={rowClassRules}
          apiRef={gridApiRef}
          dark={false}
        />
      }
      second={<GroupChatsPlaceholder>group chats</GroupChatsPlaceholder>}
    />
  );

  return (
    <Page>
      <GridGlobalStyle />
      <PageHeader>Users — click a row to chat</PageHeader>
      <SplitFill>
        <HSplit defaultSize={62} first={leftPane} second={<Chat me={session} />} />
      </SplitFill>
    </Page>
  );
};
