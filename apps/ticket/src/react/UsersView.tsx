import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled, { createGlobalStyle } from 'styled-components';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/ReactContexify.css';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { UserProfile, INACTIVITY_TIMEOUT_MS, STATUS_REFRESH_INTERVAL_MS } from '../actions/users-slice';
import { chatId, GroupChat } from '../actions/chat-slice';
import { MyGrid } from './MyGrid';
import { Chat } from './Chat';
import { HSplit, VSplit } from './SplitPane';
import { hashColor, statusDotColor } from './avatar-utils';

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

const GroupChatsHeader = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #5f6368;
  padding: 4px 2px;
  flex-shrink: 0;
`;

// ── Nickname dialog ───────────────────────────────────────────────────────────

const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogBox = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px 24px;
  width: 320px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DialogTitle = styled.div`
  font-weight: bold;
  font-size: 14px;
`;

const DialogInput = styled.input`
  padding: 7px 10px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: #1a73e8; }
`;

const DialogRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid ${p => p.$primary ? '#1a73e8' : '#dadce0'};
  background: ${p => p.$primary ? '#1a73e8' : 'white'};
  color: ${p => p.$primary ? 'white' : '#202124'};
  font-size: 13px;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

type NicknameDialogProps = {
  participants: UserProfile[];
  onConfirm: (nickname: string) => void;
  onCancel: () => void;
};

const NicknameDialog = ({ participants, onConfirm, onCancel }: NicknameDialogProps) => {
  const [value, setValue] = useState('');
  const names = participants.map(p => p.displayName ?? p.email).join(', ');

  const confirm = () => onConfirm(value.trim() || names);

  return (
    <DialogOverlay onClick={onCancel}>
      <DialogBox onClick={e => e.stopPropagation()}>
        <DialogTitle>New chat with {names}</DialogTitle>
        <DialogInput
          autoFocus
          placeholder="Nickname (optional — defaults to names)"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onCancel(); }}
        />
        <DialogRow>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn $primary onClick={confirm}>Create</Btn>
        </DialogRow>
      </DialogBox>
    </DialogOverlay>
  );
};

// ── Column defs — users ───────────────────────────────────────────────────────

const StatusDot = ({ isOnline, lastSeen }: { isOnline: boolean; lastSeen: number | null }) => (
  <div style={{
    position: 'absolute', bottom: 1, right: 1,
    width: 9, height: 9, borderRadius: '50%',
    background: statusDotColor(isOnline, lastSeen, INACTIVITY_TIMEOUT_MS),
    border: '1.5px solid #000',
  }} />
);

const AvatarCell = ({ value, data }: any) => {
  const wrap: React.CSSProperties = { position: 'relative', display: 'inline-block', marginTop: 2 };
  const dot = <StatusDot isOnline={!!data?.isOnline} lastSeen={data?.lastSeen ?? null} />;
  if (value) {
    return (
      <div style={wrap}>
        <img src={value} referrerPolicy="no-referrer" loading="lazy"
          style={{ width: 28, height: 28, borderRadius: '50%', display: 'block' }} />
        {dot}
      </div>
    );
  }
  const initial = ((data?.displayName ?? data?.email ?? '?') as string)[0].toUpperCase();
  const bg      = hashColor(data?.email ?? '');
  return (
    <div style={wrap}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        fontStyle: 'normal' }}>
        {initial}
      </div>
      {dot}
    </div>
  );
};

const lastSeenFmt = (p: any) => p.value ? new Date(p.value).toLocaleString() : '—';
const lastSeenCmp = (a: number, b: number) => (a ?? 0) - (b ?? 0);

const userColumnDefs = [
  { headerName: '',          field: 'photoURL',    width: 44,  cellRenderer: AvatarCell, sortable: false },
  { headerName: 'Name',      field: 'displayName', flex: 1,    sortable: true, filter: true },
  { headerName: 'Email',     field: 'email',       flex: 2,    sortable: true, filter: true },
  { headerName: 'Last Seen', field: 'lastSeen',    flex: 1,    minWidth: 160,  sortable: true,
    valueFormatter: lastSeenFmt, comparator: lastSeenCmp },
];

// ── Column defs — group chats ─────────────────────────────────────────────────

const MultiAvatarCell = ({ data }: any) => {
  const group = data as GroupChat & { _profiles?: UserProfile[] };
  const profiles: UserProfile[] = group?._profiles ?? [];
  const shown = profiles.slice(0, 3);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
      {shown.map(p => (
        <div key={p.uid} style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
          {p.photoURL
            ? <img src={p.photoURL} referrerPolicy="no-referrer" loading="lazy"
                style={{ width: 22, height: 22, borderRadius: '50%', display: 'block' }} />
            : <div style={{ width: 22, height: 22, borderRadius: '50%',
                background: hashColor(p.email), color: 'white', fontSize: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(p.displayName ?? p.email ?? '?')[0].toUpperCase()}
              </div>
          }
          <StatusDot isOnline={p.isOnline} lastSeen={p.lastSeen} />
        </div>
      ))}
      {profiles.length > 3 && <span style={{ fontSize: 10, color: '#888' }}>+{profiles.length - 3}</span>}
    </div>
  );
};

const groupLastFmt = (p: any) => p.value ? new Date(p.value).toLocaleString() : '—';

const groupColumnDefs = [
  { headerName: '',          field: 'id',            width: 80,  cellRenderer: MultiAvatarCell, sortable: false },
  { headerName: 'Chat',      field: 'nickname',       flex: 2,    sortable: true },
  { headerName: 'Members',   field: 'participants',   flex: 1,    sortable: false,
    valueFormatter: (p: any) => `${(p.value?.length ?? 0)} members` },
  { headerName: 'Last msg',  field: 'lastMessageAt',  flex: 1,    minWidth: 140,  sortable: true,
    valueFormatter: groupLastFmt },
];

const gridStyle = { flex: 1, width: '100%' } as React.CSSProperties;

const GridGlobalStyle = createGlobalStyle`
  .ag-theme-balham .ag-row.user-self         { font-style: italic; color: #888; }
  .ag-theme-balham .ag-row.user-unread       { font-weight: bold; }
  .ag-theme-balham .ag-row.group-pending     { font-style: italic; }
  .ag-theme-balham .ag-row.group-unread      { font-weight: bold; }
  .contexify_item__content                   { color: #202124 !important; }
`;

const USERS_MENU_ID = 'users-ctx-menu';

// ── Component ────────────────────────────────────────────────────────────────

type Props = { session: User };

export const UsersView = ({ session }: Props) => {
  const users  = useSelector(s => s.users.list);
  const unread = useSelector(s => s.chat.unread);
  const me     = useSelector(s => s.chat.me);
  const groups = useSelector(s => s.chat.groups);

  const gridApiRef      = useRef<any>(null);
  const groupGridApiRef = useRef<any>(null);

  const [dialogParticipants, setDialogParticipants] = useState<UserProfile[] | null>(null);

  const { show: showMenu } = useContextMenu({ id: USERS_MENU_ID });

  // Periodic refresh of the online dot colour
  useEffect(() => {
    const id = setInterval(() => {
      gridApiRef.current?.refreshCells({ columns: ['photoURL'], force: true });
    }, STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Firestore: keep users list fresh
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

  // Firestore: keep group chats list fresh (participant listener)
  useEffect(() => {
    if (!me?.uid) return;
    const q = query(collection(db, 'groupChats'), where('participants', 'array-contains', me.uid));
    const unsub = onSnapshot(q,
      snap => {
        const fetched: GroupChat[] = snap.docs.map(d => {
          const r = d.data();
          return {
            id:            d.id,
            participants:  r.participants  ?? [],
            nickname:      r.nickname      ?? '',
            createdBy:     r.createdBy     ?? '',
            lastMessageAt: (r.lastMessageAt as Timestamp | null)?.toMillis() ?? null,
            pending:       false,
          };
        });
        actions.chat.setGroups(fetched);
      },
      err => console.error('[groupChats listener]', err.code, err.message),
    );
    return unsub;
  }, [me?.uid]);

  // Background 1-1 message listeners (unread detection)
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
      return onSnapshot(q,
        snap => snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const d = change.doc.data();
          if (d.from === me.uid) return;
          actions.chat.messageReceived(user.email, {
            fromUid:   d.from      ?? '',
            fromEmail: d.fromEmail ?? '',
            text:      d.text      ?? '',
            timestamp: d.timestamp?.toMillis() ?? Date.now(),
          });
        }),
        err => console.error('[1-1 message listener]', user.email, err.code),
      );
    });
    return () => unsubs.forEach(u => u());
  }, [otherUidKey, me?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background group message listeners (unread detection)
  const groupIdKey = groups.filter(g => !g.pending).map(g => g.id).sort().join(',');

  useEffect(() => {
    if (!me?.uid || !groupIdKey) return;
    const since = Timestamp.now();
    const unsubs = groups.filter(g => !g.pending).map(group => {
      const q = query(
        collection(db, 'groupChats', group.id, 'messages'),
        orderBy('timestamp', 'asc'),
        where('timestamp', '>', since),
      );
      return onSnapshot(q,
        snap => snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const d = change.doc.data();
          if (d.from === me.uid) return;
          actions.chat.groupMessageReceived(group.id, {
            fromUid:   d.from      ?? '',
            fromEmail: d.fromEmail ?? '',
            text:      d.text      ?? '',
            timestamp: d.timestamp?.toMillis() ?? Date.now(),
          });
        }),
        err => console.error('[group message listener]', group.id, err.code),
      );
    });
    return () => unsubs.forEach(u => u());
  }, [groupIdKey, me?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enrich group rows with resolved UserProfile objects for the avatar cell
  const groupRows = useMemo(() => groups.map(g => ({
    ...g,
    _profiles: g.participants
      .filter(uid => uid !== me?.uid)
      .map(uid => users.find(u => u.uid === uid))
      .filter(Boolean) as UserProfile[],
  })), [groups, users, me?.uid]);

  // ── Grid rules ──────────────────────────────────────────────────────────────

  const userRowClassRules = useMemo(() => ({
    'user-self':   (p: any) => p.data?.uid === session.uid,
    'user-unread': (p: any) => !!unread[p.data?.email],
  }), [session.uid, unread]);

  const groupRowClassRules = useMemo(() => ({
    'group-pending': (p: any) => !!p.data?.pending,
    'group-unread':  (p: any) => !!unread[p.data?.id],
  }), [unread]);

  const isRowSelectable = useCallback((node: any) => node.data?.uid !== session.uid, [session.uid]);

  // ── Row click / context menu ─────────────────────────────────────────────────

  const onRowClicked = useCallback((event: any) => {
    const user = event.data as UserProfile;
    if (user && user.uid !== session.uid) {
      actions.chat.setActive({ kind: '1-1', user });
    }
  }, [session.uid]);

  const onGroupRowClicked = useCallback((event: any) => {
    const group = event.data as GroupChat;
    if (group) {
      actions.chat.setActive({ kind: 'group', id: group.id });
    }
  }, []);

  // Right-click on users grid — must not change selection
  const onCellContextMenu = useCallback((event: any) => {
    event.event?.preventDefault();
    const api = gridApiRef.current;
    if (!api) return;
    const selected: UserProfile[] = api.getSelectedRows().filter((u: UserProfile) => u.uid !== session.uid);
    showMenu({ event: event.event, props: { selected } });
  }, [session.uid, showMenu]);

  const onCreateChat = useCallback(({ props }: any) => {
    const selected: UserProfile[] = props?.selected ?? [];
    if (!selected.length) return;
    setDialogParticipants(selected);
  }, []);

  const handleDialogConfirm = useCallback(async (nickname: string) => {
    if (!me || !dialogParticipants?.length) return;
    setDialogParticipants(null);

    const allUids = [me.uid, ...dialogParticipants.map(p => p.uid)];
    // Pre-generate a real Firestore document ID so the batch write in Chat.tsx
    // can use the same ID without a round-trip.
    const realId  = doc(collection(db, 'groupChats')).id;

    const newGroup: GroupChat = {
      id:            realId,
      participants:  allUids,
      nickname,
      createdBy:     me.uid,
      lastMessageAt: null,
      pending:       true,
    };

    actions.chat.addGroup(newGroup);
    actions.chat.setActive({ kind: 'group', id: realId });
  }, [me, dialogParticipants]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const usersGrid = (
    <MyGrid
      style={gridStyle}
      rowData={users}
      columnDefs={userColumnDefs}
      onRowClicked={onRowClicked}
      contextM={onCellContextMenu}
      rowSelection="multiple"
      isRowSelectable={isRowSelectable}
      rowClassRules={userRowClassRules}
      apiRef={gridApiRef}
      dark={false}
    />
  );

  const groupChatsGrid = (
    <>
      <GroupChatsHeader>Group chats</GroupChatsHeader>
      <MyGrid
        style={gridStyle}
        rowData={groupRows}
        columnDefs={groupColumnDefs}
        onRowClicked={onGroupRowClicked}
        rowClassRules={groupRowClassRules}
        apiRef={groupGridApiRef}
        dark={false}
      />
    </>
  );

  return (
    <Page>
      <GridGlobalStyle />
      <PageHeader>Users — click to chat, right-click to create group</PageHeader>

      <SplitFill>
        <HSplit
          defaultSize={62}
          first={
            <VSplit
              defaultSize={62}
              first={usersGrid}
              second={groupChatsGrid}
            />
          }
          second={<Chat me={session} />}
        />
      </SplitFill>

      <Menu id={USERS_MENU_ID}>
        <Item onClick={onCreateChat}>New chat with selected users…</Item>
      </Menu>

      {dialogParticipants && (
        <NicknameDialog
          participants={dialogParticipants}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialogParticipants(null)}
        />
      )}
    </Page>
  );
};
