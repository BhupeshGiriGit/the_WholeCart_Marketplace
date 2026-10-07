export const PASSWORD = 'Test@123';

export const USERS = {
  buyers: ['buyer1', 'buyer2', 'buyer3'],
  sellers: ['seller1', 'seller2', 'seller3'],
  operator: ['operator'],
} as const;

export const ALL_USERS: string[] = [
  ...USERS.buyers,
  ...USERS.sellers,
  ...USERS.operator,
];