interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSITED':
        return 'bg-status.online/10 text-[rgb(34_197_94)]';
      case 'WITH_AM':
        return 'bg-[rgb(245_158_11)]/10 text-[rgb(245_158_11)]';
      case 'PENDING_ACCEPTANCE':
        return 'bg-accent text-accent-foreground';
      case 'LOCKED':
        return 'bg-destructive/10 text-destructive-foreground';
      case 'OPEN':
        return 'bg-status.online/10 text-[rgb(34_197_94)]';
      case 'CLOSED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
        status
      )}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};

