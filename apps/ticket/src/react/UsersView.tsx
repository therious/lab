import { useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled, { createGlobalStyle } from 'styled-components';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { UserProfile } from '../actions/users-slice';
import { MyGrid } from './MyGrid';
import { Chat } from './Chat';

// ── Layout ───────────────────────────────────────────────────────────────────

// Outer wrapper: flex column so the header sits above the content row
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

// Content row: grid left, chat right, both the same height
const ContentRow = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  gap: 12px;
  min-height: 0;
`;

// Fixed-width users pane
const UsersPane = styled.div`
  width: 560px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

// Chat pane: fills remaining width up to same max as the grid
const ChatPane = styled.div`
  flex: 1;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

// ── Column defs ───────────────────────────────────────────────────────────────

const AvatarCell = ({ value, data }: any) => {
  if (value) {
    return <img src={value} referrerPolicy="no-referrer" loading="lazy"
      style={{ width: 28, height: 28, borderRadius: '50%', verticalAlign: 'middle', marginTop: 2 }} />;
  }
  const initial = ((data?.displayName ?? data?.email ?? '?') as string)[0].toUpperCase();
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a73e8', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 2 }}>
      {initial}
    </div>
  );
};

const OnlineCell = ({ value }: any) => (
  <div style={{ width: 10, height: 10, borderRadius: '50%', margin: '9px auto 0',
    background: value ? '#34a853' : '#dadce0' }} />
);

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
  .ag-theme-balham .user-self { font-style: italic; color: #888; }
`;

// ── Component ────────────────────────────────────────────────────────────────

type Props = { session: User };

export const UsersView = ({ session }: Props) => {
  const users = useSelector(s => s.users.list);

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

  const rowClassRules  = useMemo(() => ({
    'user-self': (p: any) => p.data?.uid === session.uid,
  }), [session.uid]);

  const isRowSelectable = useCallback((node: any) => node.data?.uid !== session.uid, [session.uid]);

  const onRowClicked = useCallback((event: any) => {
    const user = event.data as UserProfile;
    if (user && user.uid !== session.uid) {
      actions.chat.chatWith(user);
    }
  }, [session.uid]);

  return (
    <Page>
      <GridGlobalStyle />
      <PageHeader>Users — click a row to chat</PageHeader>
      <ContentRow>
        <UsersPane>
          <MyGrid
            style={gridStyle}
            rowData={users}
            columnDefs={columnDefs}
            onRowClicked={onRowClicked}
            rowSelection="single"
            isRowSelectable={isRowSelectable}
            rowClassRules={rowClassRules}
            dark={false}
          />
        </UsersPane>
        <ChatPane>
          <Chat me={session} />
        </ChatPane>
      </ContentRow>
    </Page>
  );
};
