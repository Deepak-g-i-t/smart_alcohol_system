// Role constants
export const ROLE_AUTHORITY = 'authority';
export const ROLE_SHOP      = 'shop';
export const ROLE_BUYER     = 'buyer';

export const ROLES = [ROLE_AUTHORITY, ROLE_SHOP, ROLE_BUYER];

export const ROLE_LABELS = {
  [ROLE_AUTHORITY]: 'Authority Admin',
  [ROLE_SHOP]:      'Shop Operator',
  [ROLE_BUYER]:     'Buyer',
};

export const ROLE_ROUTES = {
  [ROLE_AUTHORITY]: '/authority',
  [ROLE_SHOP]:      '/shop',
  [ROLE_BUYER]:     '/buyer',
};

export const ALCOHOL_TYPES = [
  'Whiskey', 'Beer', 'Rum', 'Vodka',
  'Wine', 'Brandy', 'Gin', 'Other',
];
