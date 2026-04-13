import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled, { createGlobalStyle } from 'styled-components';
import { db } from '../firebase';
import { actions } from '../actions-integration';
import { UserRec } from '../actions/chat-slice';
import { MyGrid } from './MyGrid';
import { Chat } from './Chat';

type FirestoreUserRec = UserRec & { photoURL: string | null; lastSeen: Timestamp | null; };

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
  width: 380px;
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

const lastSeenFmt = (p: any) => p.value?.toDate?.()?.toLocaleString() ?? '—';
const lastSeenCmp = (a: Timestamp, b: Timestamp) => (a?.seconds ?? 0) - (b?.seconds ?? 0);

const columnDefs = [
  { headerName: 'Name',      field: 'displayName', flex: 1, sortable: true, filter: true },
  { headerName: 'Email',     field: 'email',       flex: 2, sortable: true, filter: true },
  { headerName: 'Last Seen', field: 'lastSeen',    flex: 1, sortable: true,
    valueFormatter: lastSeenFmt, comparator: lastSeenCmp },
];

const gridStyle = { flex: 1, width: '100%' } as React.CSSProperties;

const GridGlobalStyle = createGlobalStyle`
  .ag-theme-balham .user-self { font-style: italic; color: #888; }
`;

// ── Component ────────────────────────────────────────────────────────────────

type Props = { session: User };

export const UsersView = ({ session }: Props) => {
  const [users, setUsers] = useState<FirestoreUserRec[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => d.data() as FirestoreUserRec))
    );
    return unsub;
  }, []);

  const rowClassRules  = useMemo(() => ({
    'user-self': (p: any) => p.data?.uid === session.uid,
  }), [session.uid]);

  const isRowSelectable = useCallback((node: any) => node.data?.uid !== session.uid, [session.uid]);

  const onRowClicked = useCallback((event: any) => {
    const user = event.data as FirestoreUserRec;
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
