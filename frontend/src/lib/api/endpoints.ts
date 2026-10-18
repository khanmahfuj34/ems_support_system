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
  },
} as const;
