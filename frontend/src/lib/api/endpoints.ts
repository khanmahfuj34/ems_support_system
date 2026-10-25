export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
  },
  tickets: {
    base: "/tickets",
    create: "/tickets",
    list: "/tickets",
    byId: (id: string) => `/tickets/${id}`,
    comments: (id: string) => `/tickets/${id}/comments`,
  },
  admin: {
    acceptTicket: (id: string) => `/admin/tickets/${id}/accept`,
    rejectTicket: (id: string) => `/admin/tickets/${id}/reject`,
  },
  uploads: {
    create: "/uploads",
  },
  categories: {
    list: "/categories",
    subcategories: (categoryId: string) => `/categories/${categoryId}/subcategories`,
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    readAll: "/notifications/read-all",
  },
} as const;
