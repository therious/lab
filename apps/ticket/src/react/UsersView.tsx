import { useState, useEffect } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import styled from 'styled-components';
import { db } from '../firebase';
import { useSession } from '../auth';
import { MyGrid } from './MyGrid';
import { Chat, UserRec } from './Chat';

type FirestoreUserRec = UserRec & { photoURL: string | null; lastSeen: Timestamp | null; };

// ── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div<{ $chatOpen: boolean }>`
  display: grid;
  grid-template-columns: ${p => p.$chatOpen ? '1fr 1fr' : '1fr'};
  height: 100%;
`;

const GridPane = styled.div`
  display: flex; flex-direction: column;
  padding: 12px;
  overflow: hidden;
`;

const ChatPane = styled.div`
  display: flex; flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Empty = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  color: #888; font-size: 14px; font-style: italic;
  border-left: 1px solid #dadce0;
`;

// ── Column defs ──────────────────────────────────────────────────────────────

const lastSeenFmt  = (p: any) => p.value?.toDate?.()?.toLocaleString() ?? '—';
const lastSeenCmp  = (a: Timestamp, b: Timestamp) => (a?.seconds ?? 0) - (b?.seconds ?? 0);

const makeColumns = (myUid: string, onChat: (u: UserRec) => void) => [
  { headerName: 'Name',      field: 'displayName', flex: 1, sortable: true, filter: true },
  { headerName: 'Email',     field: 'email',       flex: 2, sortable: true, filter: true },
  { headerName: 'Last Seen', field: 'lastSeen',    flex: 1, sortable: true,
    valueFormatter: lastSeenFmt, comparator: lastSeenCmp },
  { headerName: '', width: 72, sortable: false, filter: false,
    cellRenderer: (p: any) => {
      if (!p.data || p.data.uid === myUid) return null;
      return (
        <button onClick={() => onChat(p.data)} style={{ padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>
          Chat
        </button>
      );
    },
  },
];

// ── Component ────────────────────────────────────────────────────────────────

const gridStyle = { height: '100%', width: '100%' };

export const UsersView = () => {
  const [session]                   = useSession();
  const [users, setUsers]           = useState<FirestoreUserRec[]>([]);
  const [chatTarget, setChatTarget] = useState<UserRec | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => d.data() as FirestoreUserRec))
    );
    return unsub;
  }, []);

  const columnDefs = session ? makeColumns(session.uid, setChatTarget) : [];

  return (
    <Page $chatOpen={!!chatTarget}>
      <GridPane>
        <h3 style={{ margin: '0 0 8px', flexShrink: 0 }}>Users</h3>
        <MyGrid style={gridStyle} rowData={users} columnDefs={columnDefs} dark={false} />
      </GridPane>

      {chatTarget && session ? (
        <ChatPane>
          <Chat me={session} them={chatTarget} onClose={() => setChatTarget(null)} />
        </ChatPane>
      ) : (
        <Empty>Select a user to start chatting</Empty>
      )}
    </Page>
  );
};
