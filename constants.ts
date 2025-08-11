export const roles = ['admin', 'requester', 'screener', 'packer', 'shipper'] as const;
export type Roles = (typeof roles)[number];
export const TOKEN_COOKIE_NAME = 'vka_token';
