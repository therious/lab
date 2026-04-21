import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import styled from 'styled-components';
import { appKey }      from '../app-key';
import { useUsersCtx } from '../context';
import { UserProfile }  from '../slices/users-slice';
import { MyGrid }       from './MyGrid';
import { hashColor }    from './avatar-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminRow = UserProfile & { roles: string[] };

// ── Styled components ─────────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
`;

const PageHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 8px;
  flex-shrink: 0;
`;

const PageHeader = styled.h3`
  margin: 0;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
`;

const GridWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
`;

const Panel = styled.div`
  width: 260px;
  flex-shrink: 0;
  border: 1px solid #dadce0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
`;

const PanelTitle = styled.div`
  font-weight: bold;
  font-size: 14px;
`;

const PanelSub = styled.div`
  font-size: 12px;
  color: #5f6368;
`;

const RoleTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const RoleTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 12px;
  font-size: 12px;
  padding: 2px 10px 2px 10px;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #888;
  font-size: 13px;
  line-height: 1;
  &:hover { color: #c62828; }
`;

// Tag shown in the "available roles" section — click ✓ to grant
const GrantTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1f8e9;
  color: #388e3c;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  font-size: 12px;
  padding: 2px 8px;
  cursor: pointer;
  &:hover { background: #dcedc8; }
`;

const AddRoleRow = styled.div`
  display: flex;
  gap: 6px;
`;

const AddInput = styled.input`
  flex: 1;
  padding: 6px 9px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: #1a73e8; }
`;

const AddBtn = styled.button`
  padding: 6px 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: default; }
`;

const EmptyPanel = styled.div`
  color: #5f6368;
  font-size: 13px;
  text-align: center;
  margin-top: 40px;
`;

const AvatarCell = styled.div<{ $bg: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${p => p.$bg};
  color: white;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

// ── Avatar cell renderer ──────────────────────────────────────────────────────

const AvatarRenderer = ({ data }: { data: AdminRow }) => {
  const initials = (data.displayName || data.email || '?')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return data.photoURL
    ? <AvatarCell $bg="transparent"><img src={data.photoURL} alt="" width={28} height={28} style={{ borderRadius: '50%' }} /></AvatarCell>
    : <AvatarCell $bg={hashColor(data.email)}>{initials}</AvatarCell>;
};

// ── Roles cell renderer ───────────────────────────────────────────────────────

const RolesRenderer = ({ data }: { data: AdminRow }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', height: '100%' }}>
    {data.roles.map((r: string) => (
      <span key={r} style={{
        background: '#e8f0fe', color: '#1a73e8',
        borderRadius: 10, fontSize: 11, padding: '1px 8px',
      }}>{r}</span>
    ))}
  </div>
);

// ── Column defs ───────────────────────────────────────────────────────────────

const columnDefs = [
  { headerName: '',          field: 'photoURL',     width: 44,  cellRenderer: AvatarRenderer, sortable: false },
  { headerName: 'Email',     field: 'email',        flex: 2,    sortable: true },
  { headerName: 'Name',      field: 'displayName',  flex: 2,    sortable: true },
  { headerName: 'Roles',     field: 'roles',        flex: 3,    cellRenderer: RolesRenderer, sortable: false, autoHeight: true },
];

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  /** Override which app's users to show. Defaults to appKey() (current origin).
   *  Pass this when rendering from the standalone admin app. */
  appId?: string;
  /** Override the context appName — used by the admin app when showing a different app's users. */
  appName?: string;
};

export const AdminView = ({ appId, appName: appNameProp }: Props) => {
  const { db, appName: ctxAppName } = useUsersCtx();
  const appName = appNameProp ?? ctxAppName;
  const [rows, setRows]         = useState<AdminRow[]>([]);
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [newRole, setNewRole]   = useState('');
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all users + their roles for this app origin (or the provided appId)
  const load = useCallback(async () => {
    const targetAppId = appId ?? appKey();
    const snap = await getDocs(collection(db, 'apps', targetAppId, 'users'));
    const profiles = snap.docs.map(d => d.data() as UserProfile);

    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const rolesSnap = await getDoc(doc(db, 'userRoles', p.uid));
        const roles: string[] = rolesSnap.exists() ? (rolesSnap.data().roles ?? []) : [];
        return { ...p, roles };
      })
    );
    setRows(enriched);
    // Refresh the selected panel if a user is already selected
    setSelected(prev => prev ? enriched.find(r => r.uid === prev.uid) ?? null : null);
  }, [db, appId]);

  useEffect(() => { load(); }, [load]);

  // All distinct roles across every user in the system, sorted
  const allSystemRoles: string[] = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.roles.forEach(role => set.add(role)));
    return Array.from(set).sort();
  }, [rows]);

  const onRowClick = useCallback(({ data }: { data: AdminRow }) => {
    setSelected(data);
    setNewRole('');
  }, []);

  const revoke = useCallback(async (role: string) => {
    if (!selected) return;
    const updated = selected.roles.filter(r => r !== role);
    await setDoc(doc(db, 'userRoles', selected.uid), { roles: updated }, { merge: true });
    await load();
  }, [selected, db, load]);

  // Grant a role by name — used by both the text input and the system-roles tag list
  const grantRole = useCallback(async (role: string) => {
    if (!role || !selected) return;
    if (selected.roles.includes(role)) return;
    setSaving(true);
    try {
      const updated = [...selected.roles, role];
      await setDoc(doc(db, 'userRoles', selected.uid), { roles: updated }, { merge: true });
      await load();
    } finally {
      setSaving(false);
    }
  }, [selected, db, load]);

  const grantFromInput = useCallback(async () => {
    const role = newRole.trim();
    await grantRole(role);
    setNewRole('');
    inputRef.current?.focus();
  }, [newRole, grantRole]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') grantFromInput();
  };

  const placeholder = appName ? `e.g. ${appName}:admin` : 'appname:rolename';

  return (
    <Page>
      <PageHeaderRow>
        <PageHeader>Admin — Users &amp; Roles</PageHeader>
      </PageHeaderRow>
      <Body>
        <GridWrap>
          <MyGrid
            style={{ height: '100%', width: '100%' }}
            rowData={rows}
            columnDefs={columnDefs}
            onRowClicked={onRowClick}
            rowSelection="single"
            dark={false}
          />
        </GridWrap>

        <Panel>
          {selected ? (
            <>
              <PanelTitle>{selected.displayName || selected.email}</PanelTitle>
              <PanelSub>{selected.email}</PanelSub>

              <div>
                <PanelSub style={{ marginBottom: 6 }}>Roles</PanelSub>
                <RoleTagRow>
                  {selected.roles.length === 0
                    ? <PanelSub>No roles assigned</PanelSub>
                    : selected.roles.map(r => (
                        <RoleTag key={r}>
                          {r}
                          <RemoveBtn onClick={() => revoke(r)} title="Revoke">×</RemoveBtn>
                        </RoleTag>
                      ))
                  }
                </RoleTagRow>
              </div>

              {/* Roles that exist elsewhere in the system but not on this user */}
              {allSystemRoles.filter(r => !selected.roles.includes(r)).length > 0 && (
                <div>
                  <PanelSub style={{ marginBottom: 6 }}>Grant from existing roles</PanelSub>
                  <RoleTagRow>
                    {allSystemRoles
                      .filter(r => !selected.roles.includes(r))
                      .map(r => (
                        <GrantTag key={r} onClick={() => grantRole(r)} title="Grant this role">
                          {r} ✓
                        </GrantTag>
                      ))
                    }
                  </RoleTagRow>
                </div>
              )}

              <div>
                <PanelSub style={{ marginBottom: 6 }}>Grant new role</PanelSub>
                <AddRoleRow>
                  <AddInput
                    ref={inputRef}
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                  />
                  <AddBtn onClick={grantFromInput} disabled={!newRole.trim() || saving}>
                    {saving ? '…' : 'Add'}
                  </AddBtn>
                </AddRoleRow>
              </div>
            </>
          ) : (
            <EmptyPanel>Select a user to manage roles</EmptyPanel>
          )}
        </Panel>
      </Body>
    </Page>
  );
};
