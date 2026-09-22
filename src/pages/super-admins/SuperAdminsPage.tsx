import { StaffListPage } from '../staff/StaffListPage';

export function SuperAdminsPage() {
  return (
    <StaffListPage
      fixedUserType="super_admin"
      title="Super Admins"
      subtitle="Accounts with unrestricted access across every office and module."
      createLabel="Create Super Admin"
      createTo="/staff/new?userType=super_admin"
    />
  );
}
