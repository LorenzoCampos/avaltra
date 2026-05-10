type DashboardQueryError = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

export const getDashboardErrorMessage = (error: unknown, fallback: string) => {
  const dashboardError = error as DashboardQueryError | null;

  return dashboardError?.response?.data?.error ?? dashboardError?.message ?? fallback;
};
