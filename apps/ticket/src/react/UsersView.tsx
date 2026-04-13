import { useState, useEffect } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../auth';
import { MyGrid } from './MyGrid';
import { Chat, UserRec } from './Chat';

type FirestoreUserRec = UserRec & { photoURL: string | null; lastSeen: Timestamp | null; };

const gridStyle = { height: '360px', width: '100%' };

const lastSeenFormatter = (p: any) => p.value?.toDate?.()?.toLocaleString() ?? '—';

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

  const columnDefs = [
    { headerName: 'Name',      field: 'displayName', flex: 1, sortable: true, filter: true },
    { headerName: 'Email',     field: 'email',       flex: 2, sortable: true, filter: true },
    { headerName: 'Last Seen', field: 'lastSeen',    flex: 1, sortable: true,
      valueFormatter: lastSeenFormatter,
      comparator: (a: Timestamp, b: Timestamp) => (a?.seconds ?? 0) - (b?.seconds ?? 0),
    },
    {
      headerName: '',
      width: 80,
      sortable: false, filter: false,
      cellRenderer: (params: any) => {
        if (!session || params.data?.uid === session.uid) return null;
        return (
          <button
            onClick={() => setChatTarget(params.data)}
            style={{ padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}
          >
            Chat
          </button>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ margin: '0 0 10px' }}>Users</h3>
      <MyGrid style={gridStyle} rowData={users} columnDefs={columnDefs} dark={false} />
      {chatTarget && session && (
        <Chat me={session} them={chatTarget} onClose={() => setChatTarget(null)} />
      )}
    </div>
  );
};
