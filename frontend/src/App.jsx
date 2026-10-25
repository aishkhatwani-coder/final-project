import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Portfolio from './pages/Portfolio';
import PortfolioDetail from './pages/PortfolioDetail';
import BookConsultation from './pages/BookConsultation';
import Billing from './pages/Billing';
import Feedback from './pages/Feedback';
import Items from './pages/Items';
import AdminDashboard from './pages/AdminDashboard';
import MyOrders from './pages/MyOrders';
import AdminRoute from './components/AdminRoute';

function AppRoutes() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <Navbar />}
      {!isAdminPage && <CartDrawer />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login adminMode />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:id" element={<PortfolioDetail />} />
        <Route path="/items" element={<Items />} />
        <Route path="/book-consultation" element={<BookConsultation />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;