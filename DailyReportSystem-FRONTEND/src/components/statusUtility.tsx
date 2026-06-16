export const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'backlog':
        return 'default';
      case 'ready':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'blocked':
        return 'error';
      case 'review':
        return 'warning';
      case 'testing':
        return 'secondary';
      case 'done':
        return 'success';
      case 'deployed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };