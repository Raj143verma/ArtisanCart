import { Roles } from '../constants/roles.js';
import { Permissions } from '../constants/permissions.js';

const rolePermissions = {
  [Roles.CUSTOMER]: [
    Permissions.PRODUCT_VIEW,
    Permissions.PRODUCT_LIST,
    Permissions.ORDER_VIEW,
    Permissions.ORDER_CREATE,
    Permissions.ORDER_LIST,
    Permissions.REVIEW_VIEW,
    Permissions.NOTIFICATION_VIEW,
    Permissions.CUSTOM_ORDER_VIEW,
  ],

  [Roles.SELLER]: [
    Permissions.PRODUCT_VIEW,
    Permissions.PRODUCT_CREATE,
    Permissions.PRODUCT_UPDATE,
    Permissions.PRODUCT_DELETE,
    Permissions.PRODUCT_LIST,
    Permissions.CATEGORY_VIEW,
    Permissions.CATEGORY_CREATE,
    Permissions.CATEGORY_UPDATE,
    Permissions.ORDER_VIEW,
    Permissions.ORDER_UPDATE,
    Permissions.ORDER_LIST,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_UPDATE,
    Permissions.ANALYTICS_VIEW,
    Permissions.COUPON_VIEW,
    Permissions.COUPON_CREATE,
    Permissions.COUPON_UPDATE,
    Permissions.REVIEW_VIEW,
    Permissions.CUSTOM_ORDER_VIEW,
    Permissions.CUSTOM_ORDER_MANAGE,
    Permissions.NOTIFICATION_VIEW,
    Permissions.STORE_VIEW,
    Permissions.STORE_UPDATE,
  ],

  [Roles.SUPER_ADMIN]: [
    Permissions.PRODUCT_VIEW,
    Permissions.PRODUCT_CREATE,
    Permissions.PRODUCT_UPDATE,
    Permissions.PRODUCT_DELETE,
    Permissions.PRODUCT_LIST,
    Permissions.CATEGORY_VIEW,
    Permissions.CATEGORY_CREATE,
    Permissions.CATEGORY_UPDATE,
    Permissions.CATEGORY_DELETE,
    Permissions.ORDER_VIEW,
    Permissions.ORDER_CREATE,
    Permissions.ORDER_UPDATE,
    Permissions.ORDER_CANCEL,
    Permissions.ORDER_LIST,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_UPDATE,
    Permissions.ANALYTICS_VIEW,
    Permissions.COUPON_VIEW,
    Permissions.COUPON_CREATE,
    Permissions.COUPON_UPDATE,
    Permissions.COUPON_DELETE,
    Permissions.REVIEW_VIEW,
    Permissions.REVIEW_MODERATE,
    Permissions.CUSTOM_ORDER_VIEW,
    Permissions.CUSTOM_ORDER_MANAGE,
    Permissions.NOTIFICATION_VIEW,
    Permissions.NOTIFICATION_SEND,
    Permissions.STORE_VIEW,
    Permissions.STORE_UPDATE,
    Permissions.STORE_APPROVE,
    Permissions.USER_VIEW,
    Permissions.USER_UPDATE,
    Permissions.USER_MANAGE,
    Permissions.ADMIN_DASHBOARD_ACCESS,
  ],
};

export function getPermissionsForRole(role) {
  return rolePermissions[role] || [];
}

export function hasPermission(role, permission) {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

export function isRoleHigherOrEqual(role, targetRole) {
  const hierarchy = [Roles.CUSTOMER, Roles.SELLER, Roles.SUPER_ADMIN];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(targetRole);
}

export const permissionConfig = {
  rolePermissions,
  roles: Object.values(Roles),
};
