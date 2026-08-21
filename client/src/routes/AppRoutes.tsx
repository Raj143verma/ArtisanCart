import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { SellerLayout } from '../layouts/SellerLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { AdminAuditLogsPage, AdminHome, AdminKycPage, AdminOrdersPage, AdminPayoutsPage, AdminReturnsPage, AdminStoresPage, CartPage, CustomerHome, CustomerOrdersPage, ProductsPage, SellerHome, SellerKycPage, SellerOrdersPage, SellerPayoutsPage, SellerProductsPage } from '../pages/PlaceholderRoutes';
import { ProtectedRoute, RoleRoute } from './RouteGuards';

export function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}><Route path="/" element={<HomePage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /></Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleRoute allowedRoles={['customer']} />}><Route element={<CustomerLayout />}><Route path="/customer" element={<CustomerHome />} /><Route path="/customer/products" element={<ProductsPage />} /><Route path="/customer/cart" element={<CartPage />} /><Route path="/customer/orders" element={<CustomerOrdersPage />} /></Route></Route>
      <Route element={<RoleRoute allowedRoles={['seller']} />}><Route element={<SellerLayout />}><Route path="/seller" element={<SellerHome />} /><Route path="/seller/products" element={<SellerProductsPage />} /><Route path="/seller/orders" element={<SellerOrdersPage />} /><Route path="/seller/kyc" element={<SellerKycPage />} /><Route path="/seller/payouts" element={<SellerPayoutsPage />} /></Route></Route>
      <Route element={<RoleRoute allowedRoles={['super_admin']} />}><Route element={<AdminLayout />}><Route path="/admin" element={<AdminHome />} /><Route path="/admin/stores" element={<AdminStoresPage />} /><Route path="/admin/kyc" element={<AdminKycPage />} /><Route path="/admin/orders" element={<AdminOrdersPage />} /><Route path="/admin/returns" element={<AdminReturnsPage />} /><Route path="/admin/payouts" element={<AdminPayoutsPage />} /><Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} /></Route></Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
