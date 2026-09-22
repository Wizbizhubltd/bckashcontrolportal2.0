export type StatusType =
  | 'Active'
  | 'Inactive'
  | 'Approved'
  | 'Pending'
  | 'Declined'
  | 'Blocked'
  | 'Closed'
  | 'Disbursed'
  | 'New'
  | 'NeedChanges'
  | 'Rejected'
  | 'Withdrawn'
  | 'WrittenOff'
  | 'PendingReschedule'
  | 'Rescheduled'
  | 'Paid';

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: StatusType) => {
    switch (status) {
      case 'Active':
      case 'Approved':
      case 'Disbursed':
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
      case 'NeedChanges':
      case 'PendingReschedule':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Declined':
      case 'Blocked':
      case 'Rejected':
      case 'WrittenOff':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Inactive':
      case 'Closed':
      case 'Withdrawn':
      case 'New':
      case 'Rescheduled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-heading font-medium border ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
}
