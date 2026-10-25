import { useCallback, useEffect, useState } from 'react';
import {
  createPortfolioItem,
  createStoreItem,
  clearAdminClientData,
  deleteAdminOrder,
  deletePortfolioItem,
  getAdminItems,
  getAdminOrders,
  getAdminPayments,
  getAdminPortfolio,
  updateConsultationFinancials,
  updateOrderPayment,
  updateOrderStatus,
  updatePaymentStatus,
  updatePortfolioItem,
  updateStoreItem
} from '../api/admin';
import { getConsultations, updateConsultationStatus } from '../api/consultation';
import { useAuth } from '../context/useAuth';
import './AdminDashboard.css';

const orderStages = ['Processing', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled'];
const consultationStatuses = [
  'Pending',
  'Contacted',
  'Meeting Arranged',
  'Site Visit Scheduled',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled'
];
const portfolioCategories = ['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Full Home', 'Other'];
const productCategories = [
  'Lighting & Lamps',
  'Seating & Chairs',
  'Cupboards & Wardrobes',
  'Cabinets & Storage',
  'Wallpapers & Wall Decor',
  'Tables & Consoles',
  'Rugs & Textiles',
  'Decor & Accents'
];
const paymentStatuses = ['Pending', 'Completed', 'Failed', 'Refunded'];
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const listFrom = (data, key) => Array.isArray(data) ? data : data?.[key] || [];
const paymentMilestoneStatus = (payment) => {
  const title = payment.milestoneTitle || 'Project installment';
  if (payment.status === 'Completed') {
    if (/token/i.test(title)) return 'Token paid';
    const percentage = title.match(/(\d{1,3})\s*%/);
    return percentage ? `${percentage[1]}% payment done` : `${title} paid`;
  }
  if (payment.status === 'Pending') {
    if (/token/i.test(title)) return 'Token submitted · awaiting verification';
    const percentage = title.match(/(\d{1,3})\s*%/);
    return percentage
      ? `${percentage[1]}% payment submitted · awaiting verification`
      : `${title} submitted · awaiting verification`;
  }
  return `${title} · ${String(payment.status || 'Unknown').toLowerCase()}`;
};
const EMPTY_PORTFOLIO = {
  title: '',
  category: 'Living Room',
  style: 'Modern',
  designerName: '',
  description: '',
  images: '',
  budgetRange: '',
  areaSize: '',
  duration: ''
};
const EMPTY_PRODUCT = {
  name: '',
  category: 'Lighting & Lamps',
  price: '',
  description: '',
  images: '',
  inStock: true
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');
  const [portfolioForm, setPortfolioForm] = useState(EMPTY_PORTFOLIO);
  const [editingPortfolioId, setEditingPortfolioId] = useState('');
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [projectDrafts, setProjectDrafts] = useState({});

  const loadDashboard = useCallback(async () => {
    const results = await Promise.allSettled([
      getAdminOrders(),
      getConsultations(),
      getAdminPortfolio(),
      getAdminItems(),
      getAdminPayments()
    ]);
    setErrors({});
    const setters = [
      (result) => setOrders(listFrom(result, 'orders')),
      (result) => setConsultations(listFrom(result, 'consultations')),
      (result) => setPortfolio(listFrom(result, 'projects')),
      (result) => setProducts(listFrom(result, 'items')),
      (result) => setPayments(listFrom(result, 'payments'))
    ];
    const names = ['Orders', 'Consultations', 'Portfolio', 'Products', 'Payments'];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        setters[index](result.value.data);
      } else {
        console.error(`Admin ${names[index].toLowerCase()} loading failed:`, result.reason);
        setErrors((previous) => ({
          ...previous,
          [names[index]]: result.reason?.response?.data?.message ||
            `Could not load ${names[index].toLowerCase()}. Please refresh and try again.`
        }));
      }
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab !== 'consultations' && activeTab !== 'payments') return undefined;
    const refreshTimer = window.setInterval(() => {
      loadDashboard();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [activeTab, loadDashboard]);

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const updateOrder = async (order, changes) => {
    try {
      setSavingId(String(order._id));
      const response = await changes();
      const updatedOrder = response?.data?.order;
      if (updatedOrder) {
        setOrders((current) => current.map((entry) =>
          entry._id === updatedOrder._id ? updatedOrder : entry
        ));
      }
      setNotice('Order updated.');
    } catch (error) {
      console.error('Admin order update failed:', error);
      setNotice(error.response?.data?.message || error.response?.data?.error || 'Could not update order.');
    } finally {
      setSavingId('');
    }
  };

  const handleOrderPayment = (order) => {
    const amount = Number(paymentDrafts[order._id] ?? order.amountPaid ?? 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(order.totalAmount)) {
      setNotice('Received amount must be between ₹0 and the order total.');
      return;
    }
    updateOrder(order, () => updateOrderPayment(order.orderNumber || order._id, { amountPaid: amount }));
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Delete order ${order.orderNumber} for ${order.clientName}? This removes only this order.`)) {
      return;
    }
    try {
      setSavingId(order._id);
      await deleteAdminOrder(order._id);
      setOrders((current) => current.filter((entry) => entry._id !== order._id));
      setNotice(`Order ${order.orderNumber} deleted.`);
    } catch (error) {
      console.error('Order deletion failed:', error);
      setNotice(error.response?.data?.message || 'Could not delete the order.');
    } finally {
      setSavingId('');
    }
  };

  const handleClearClientData = async (clientEmail, clientName) => {
    const normalizedEmail = String(clientEmail || '').trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice('This client does not have an email address to identify their records.');
      return;
    }
    if (!window.confirm(
      `Permanently delete ALL orders, consultations, payments, and receipts for ${clientName} (${normalizedEmail})? This cannot be undone.`
    )) {
      return;
    }
    const confirmation = window.prompt(`Type ${normalizedEmail} to confirm clearing this client's data.`);
    if (confirmation?.trim().toLowerCase() !== normalizedEmail) {
      setNotice('Client data clear canceled: email confirmation did not match.');
      return;
    }

    try {
      setSavingId(`client:${normalizedEmail}`);
      const response = await clearAdminClientData(normalizedEmail);
      const matchesClient = (record) => String(record.clientEmail || '').trim().toLowerCase() === normalizedEmail;
      const clientConsultationIds = new Set(consultations
        .filter(matchesClient)
        .map((consultation) => String(consultation._id)));
      setOrders((current) => current.filter((record) => !matchesClient(record)));
      setConsultations((current) => current.filter((record) => !matchesClient(record)));
      setPayments((current) => current.filter((record) => {
        const consultationId = record.consultationId?._id || record.consultationId;
        return !matchesClient(record) && !clientConsultationIds.has(String(consultationId || ''));
      }));
      setProjectDrafts((current) => Object.fromEntries(
        Object.entries(current).filter(([consultationId]) => !clientConsultationIds.has(consultationId))
      ));
      const deleted = response.data.deleted || {};
      setNotice(
        `${response.data.message || `All records for ${normalizedEmail} have been deleted.`} ` +
        `(Orders: ${deleted.orders || 0}, consultations: ${deleted.consultations || 0}, payments/receipts: ${deleted.payments || 0})`
      );
    } catch (error) {
      console.error('Client data clear failed:', error);
      setNotice(error.response?.data?.message || 'Could not clear all client data.');
    } finally {
      setSavingId('');
    }
  };

  const handlePortfolioSubmit = async (event) => {
    event.preventDefault();
    setNotice('');
    const payload = {
      ...portfolioForm,
      images: portfolioForm.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
    };
    try {
      setSavingId('portfolio-form');
      const response = editingPortfolioId
        ? await updatePortfolioItem(editingPortfolioId, payload)
        : await createPortfolioItem(payload);
      const saved = response.data;
      setPortfolio((current) => editingPortfolioId
        ? current.map((project) => project._id === editingPortfolioId ? saved : project)
        : [saved, ...current]);
      setPortfolioForm(EMPTY_PORTFOLIO);
      setEditingPortfolioId('');
      setNotice(editingPortfolioId ? 'Portfolio project updated.' : 'Portfolio project added.');
    } catch (error) {
      console.error('Portfolio save failed:', error);
      setNotice(error.response?.data?.message || 'Could not save the portfolio project.');
    } finally {
      setSavingId('');
    }
  };

  const startPortfolioEdit = (project) => {
    setEditingPortfolioId(project._id);
    setPortfolioForm({
      title: project.title || '',
      category: project.category || 'Living Room',
      style: project.style || 'Modern',
      designerName: project.designerName || '',
      description: project.description || '',
      images: (project.images || []).join('\n'),
      budgetRange: project.budgetRange || '',
      areaSize: project.areaSize || '',
      duration: project.duration || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortfolioDelete = async (project) => {
    if (!window.confirm(`Delete "${project.title}" from the portfolio?`)) return;
    try {
      setSavingId(project._id);
      await deletePortfolioItem(project._id);
      setPortfolio((current) => current.filter((entry) => entry._id !== project._id));
      setNotice('Portfolio project deleted.');
    } catch (error) {
      console.error('Portfolio delete failed:', error);
      setNotice(error.response?.data?.message || 'Could not delete the portfolio project.');
    } finally {
      setSavingId('');
    }
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    const images = productForm.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    try {
      setSavingId('product-form');
      const response = await createStoreItem({
        ...productForm,
        price: Number(productForm.price),
        images
      });
      const saved = response.data.item;
      setProducts((current) => [saved, ...current]);
      setProductForm(EMPTY_PRODUCT);
      setNotice('Product added to the catalog.');
    } catch (error) {
      console.error('Product create failed:', error);
      setNotice(error.response?.data?.message || 'Could not add the product.');
    } finally {
      setSavingId('');
    }
  };

  const toggleProductStock = async (product) => {
    try {
      setSavingId(product._id);
      const response = await updateStoreItem(product._id, { inStock: !product.inStock });
      const updated = response.data.item;
      setProducts((current) => current.map((entry) =>
        entry._id === product._id ? updated : entry
      ));
      setNotice(`${product.name} marked ${updated.inStock ? 'in stock' : 'out of stock'}.`);
    } catch (error) {
      console.error('Product stock update failed:', error);
      setNotice(error.response?.data?.message || 'Could not update product stock.');
    } finally {
      setSavingId('');
    }
  };

  const handleConsultationStatus = async (consultation, status) => {
    try {
      setSavingId(consultation._id);
      const response = await updateConsultationStatus(consultation._id, { status });
      setConsultations((current) => current.map((entry) =>
        entry._id === consultation._id ? response.data.consultation : entry
      ));
      setNotice('Consultation status updated.');
    } catch (error) {
      console.error('Consultation update failed:', error);
      setNotice(error.response?.data?.message || 'Could not update consultation.');
    } finally {
      setSavingId('');
    }
  };

  const saveProjectAmount = async (consultation) => {
    const amount = Number(projectDrafts[consultation._id] ?? consultation.agreedProjectAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice('Enter a valid agreed project amount.');
      return;
    }
    try {
      setSavingId(consultation._id);
      const response = await updateConsultationFinancials(consultation._id, {
        agreedProjectAmount: amount
      });
      setConsultations((current) => current.map((entry) =>
        entry._id === consultation._id ? response.data.consultation : entry
      ));
      setNotice('Agreed project amount saved.');
    } catch (error) {
      console.error('Project amount save failed:', error);
      setNotice(error.response?.data?.message || 'Could not save the agreed amount.');
    } finally {
      setSavingId('');
    }
  };

  const handlePaymentStatus = async (payment, status) => {
    try {
      setSavingId(payment._id);
      const response = await updatePaymentStatus(payment._id, status);
      setPayments((current) => current.map((entry) =>
        entry._id === payment._id ? response.data.payment : entry
      ));
      if (payment.consultationId) {
        const consultationId = payment.consultationId._id || payment.consultationId;
        const result = await getConsultations();
        setConsultations(listFrom(result.data, 'consultations'));
        if (consultationId) setNotice('Payment status updated; project balance refreshed.');
      } else {
        setNotice('Payment status updated.');
      }
    } catch (error) {
      console.error('Payment status update failed:', error);
      setNotice(error.response?.data?.message || 'Could not update payment status.');
    } finally {
      setSavingId('');
    }
  };

  const clientRecordsByEmail = new Map();
  const addClientRecord = (record, collection) => {
    const email = String(record.clientEmail || '').trim().toLowerCase();
    if (!email) return;
    const client = clientRecordsByEmail.get(email) || {
      email,
      name: record.clientName || 'Client',
      orders: [],
      consultations: [],
      payments: []
    };
    client[collection].push(record);
    clientRecordsByEmail.set(email, client);
  };
  orders.forEach((order) => addClientRecord(order, 'orders'));
  consultations.forEach((consultation) => addClientRecord(consultation, 'consultations'));
  payments.forEach((payment) => addClientRecord(payment, 'payments'));
  const clientRecords = [...clientRecordsByEmail.values()].sort((first, second) =>
    first.name.localeCompare(second.name)
  );

  const tabs = [
    { id: 'overview', label: 'Orders', count: orders.length },
    { id: 'clients', label: 'Clients & Data', count: clientRecords.length },
    { id: 'consultations', label: 'Consultations & Projects', count: consultations.length },
    { id: 'portfolio', label: 'Portfolio', count: portfolio.length },
    { id: 'products', label: 'Products & Stock', count: products.length },
    { id: 'payments', label: 'Payments', count: payments.length }
  ];

  if (loading) {
    return <div className="admin-loading">Loading studio management dashboard...</div>;
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-title-group">
            <span className="admin-badge">Private Admin</span>
            <h1>Studio Management</h1>
            <p>Manage client requests, projects, portfolio, catalog stock, and payments.</p>
          </div>
          <div className="admin-header-actions">
            <span>{user?.name || 'Administrator'}</span>
            <a className="btn-refresh" href="/" target="_blank" rel="noopener noreferrer">
              Open client website ↗
            </a>
            <button className="btn-refresh" type="button" disabled={refreshing} onClick={refreshDashboard}>
              {refreshing ? 'Refreshing...' : 'Refresh dashboard'}
            </button>
            <button className="admin-button secondary" type="button" onClick={logout}>Sign out</button>
          </div>
        </header>

        {notice && (
          <div className="admin-notice" role="status">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
          </div>
        )}

        <nav className="admin-tabs" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}<span className="tab-counter">{tab.count}</span>
            </button>
          ))}
        </nav>

        {Object.entries(errors).map(([section, message]) => (
          <div className="admin-error" key={section} role="alert">
            <strong>{section}:</strong> {message}
          </div>
        ))}

        {activeTab === 'overview' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">SHOP OPERATIONS</span><h2>Product Orders</h2></div>
              <span>{orders.length} orders</span>
            </div>
            {!orders.length ? <div className="admin-empty">No product orders have been placed yet.</div> : (
              <div className="admin-card-list">
                {orders.map((order) => {
                  const amountPaid = Number(order.amountPaid) ||
                    (order.paymentStatus === 'Completed' ? Number(order.totalAmount || 0) : 0);
                  const due = Math.max(0, Number(order.totalAmount || 0) - amountPaid);
                  return (
                    <article className="admin-record-card" key={order._id}>
                      <div className="admin-record-head">
                        <div>
                          <span className="admin-eyebrow">ORDER {order.orderNumber}</span>
                          <h3>{order.clientName}</h3>
                          <p>{order.clientEmail} · {order.clientPhone}</p>
                        </div>
                        <div className="admin-order-actions">
                          <span className={`admin-status ${String(order.paymentStatus || 'Pending').toLowerCase().replaceAll(' ', '-')}`}>
                            {order.paymentStatus || 'Pending'}
                          </span>
                          <button
                            className="admin-button danger small"
                            type="button"
                            disabled={savingId === order._id}
                            onClick={() => handleDeleteOrder(order)}
                          >
                            {savingId === order._id ? 'Deleting…' : 'Delete order'}
                          </button>
                          <button
                            className="admin-button danger small"
                            type="button"
                            disabled={savingId === `client:${String(order.clientEmail || '').trim().toLowerCase()}`}
                            onClick={() => handleClearClientData(order.clientEmail, order.clientName)}
                          >
                            Clear all client data
                          </button>
                        </div>
                      </div>
                      <div className="admin-data-grid">
                        <div><strong>Items</strong><span>{(order.items || []).map((item) => `${item.name} ×${item.quantity}`).join(', ') || '—'}</span></div>
                        <div><strong>Delivery</strong><span>{order.shippingAddress?.street}, {order.shippingAddress?.city} {order.shippingAddress?.pincode}</span></div>
                        <div><strong>Order total</strong><span>{currency(order.totalAmount)}</span></div>
                        <div><strong>Received</strong><span>{currency(amountPaid)}</span></div>
                        <div><strong>Balance due</strong><span>{currency(due)}</span></div>
                        <div><strong>Payment method</strong><span>{order.paymentMethod || '—'}</span></div>
                      </div>
                      <div className="admin-inline-controls">
                        <label>
                          Delivery status
                          <select
                            value={order.orderStatus || order.status || 'Processing'}
                            disabled={savingId === order._id}
                            onChange={(event) => updateOrder(order, () =>
                              updateOrderStatus(order.orderNumber || order._id, { status: event.target.value })
                            )}
                          >
                            {orderStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                          </select>
                        </label>
                        <label>
                          Amount received (₹)
                          <input
                            type="number"
                            min="0"
                            max={order.totalAmount}
                            value={paymentDrafts[order._id] ?? amountPaid}
                            onChange={(event) => setPaymentDrafts((current) => ({
                              ...current,
                              [order._id]: event.target.value
                            }))}
                          />
                        </label>
                        <button className="admin-button" type="button" disabled={savingId === order._id} onClick={() => handleOrderPayment(order)}>
                          Save payment
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'clients' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">CLIENT RECORDS</span><h2>Clients & Data Management</h2></div>
              <span>{clientRecords.length} clients</span>
            </div>
            <p className="admin-help">
              Delete one order, or permanently clear a client’s orders, consultations, payments, and receipts.
              Clearing all data does not delete the client’s login account.
            </p>
            {!clientRecords.length ? (
              <div className="admin-empty">No client records are available to manage.</div>
            ) : (
              <div className="admin-card-list">
                {clientRecords.map((client) => {
                  const clientSavingId = `client:${client.email}`;
                  return (
                    <article className="admin-record-card" key={client.email}>
                      <div className="admin-record-head">
                        <div>
                          <span className="admin-eyebrow">CLIENT DATA</span>
                          <h3>{client.name}</h3>
                          <p><a href={`mailto:${client.email}`}>{client.email}</a></p>
                        </div>
                        <button
                          className="admin-button danger"
                          type="button"
                          disabled={savingId === clientSavingId}
                          onClick={() => handleClearClientData(client.email, client.name)}
                        >
                          {savingId === clientSavingId ? 'Clearing client data…' : 'Clear all client data'}
                        </button>
                      </div>
                      <div className="admin-data-grid">
                        <div><strong>Orders</strong><span>{client.orders.length}</span></div>
                        <div><strong>Consultations</strong><span>{client.consultations.length}</span></div>
                        <div><strong>Payments / receipts</strong><span>{client.payments.length}</span></div>
                      </div>
                      {client.orders.length > 0 && (
                        <div className="admin-payment-history">
                          <strong>Individual orders</strong>
                          {client.orders.map((order) => (
                            <div key={order._id}>
                              <span>
                                {order.orderNumber || 'Order'} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                                {' · '}{currency(order.totalAmount)}
                              </span>
                              <button
                                className="admin-button danger small"
                                type="button"
                                disabled={savingId === order._id}
                                onClick={() => handleDeleteOrder(order)}
                              >
                                {savingId === order._id ? 'Deleting…' : 'Delete order'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'consultations' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">CLIENT MEETINGS</span><h2>Consultations & Project Accounts</h2></div>
              <span>{consultations.length} requests</span>
            </div>
            <p className="admin-help">Client payment submissions show here after refresh. Verify receipt in your account before marking each payment Completed; only verified amounts count as paid or reduce the project balance.</p>
            {!consultations.length ? <div className="admin-empty">No consultation bookings yet.</div> : (
              <div className="admin-card-list">
                {consultations.map((consultation) => {
                  const linkedPayments = payments.filter((payment) => {
                    const id = payment.consultationId?._id || payment.consultationId;
                    return String(id || '') === String(consultation._id);
                  });
                  const paid = linkedPayments.reduce((sum, payment) =>
                    sum + (payment.status === 'Completed' ? Number(payment.amountPaid || 0) : 0), 0);
                  const pending = linkedPayments.reduce((sum, payment) =>
                    sum + (payment.status === 'Pending' ? Number(payment.amountPaid || 0) : 0), 0);
                  const agreed = Number(consultation.agreedProjectAmount || 0);
                  const balance = Math.max(0, agreed - paid);
                  const paidPercent = agreed > 0 ? Math.min(100, Math.round((paid / agreed) * 100)) : 0;
                  return (
                    <article className="admin-record-card" key={consultation._id}>
                      <div className="admin-record-head">
                        <div>
                          <span className="admin-eyebrow">BOOKED {consultation.createdAt ? new Date(consultation.createdAt).toLocaleString() : ''}</span>
                          <h3>{consultation.clientName}</h3>
                          <p><a href={`mailto:${consultation.clientEmail}`}>{consultation.clientEmail}</a> · <a href={`tel:${consultation.clientPhone}`}>{consultation.clientPhone}</a></p>
                        </div>
                        <label className="admin-status-control">
                          Booking status
                          <select
                            value={consultation.status || 'Pending'}
                            disabled={savingId === consultation._id}
                            onChange={(event) => handleConsultationStatus(consultation, event.target.value)}
                          >
                            {consultationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </label>
                        <button
                          className="admin-button danger"
                          type="button"
                          disabled={savingId === `client:${String(consultation.clientEmail || '').trim().toLowerCase()}`}
                          onClick={() => handleClearClientData(consultation.clientEmail, consultation.clientName)}
                        >
                          Clear all client data
                        </button>
                      </div>
                      <div className="admin-data-grid">
                        <div><strong>Room / property</strong><span>{consultation.roomType} · {consultation.propertyType}</span></div>
                        <div><strong>Preferred time</strong><span>{consultation.preferredDate ? new Date(consultation.preferredDate).toLocaleDateString() : 'Date not selected'} · {consultation.preferredTimeSlot || 'Time not selected'}</span></div>
                        <div><strong>Mode / architect</strong><span>{consultation.consultationMode || 'Not specified'} · {consultation.preferredArchitect || 'Not specified'}</span></div>
                        <div><strong>Style / area</strong><span>{consultation.preferredStyle || '—'} · {consultation.areaSize || '—'}</span></div>
                        <div><strong>Budget estimate</strong><span>{consultation.budgetRange || '—'}</span></div>
                        <div><strong>Project title</strong><span>{consultation.referenceProjectTitle || '—'}</span></div>
                      </div>
                      {consultation.notes && <p className="admin-notes"><strong>Client notes:</strong> {consultation.notes}</p>}

                      <div className="admin-finance-summary">
                        <div><strong>Agreed total</strong><span>{agreed > 0 ? currency(agreed) : 'Not set'}</span></div>
                        <div><strong>Verified paid</strong><span>{currency(paid)}{agreed > 0 ? ` · ${paidPercent}%` : ''}</span></div>
                        <div><strong>Awaiting verification</strong><span>{currency(pending)}</span></div>
                        <div><strong>Balance remaining</strong><span>{agreed > 0 ? currency(balance) : 'Set agreed total first'}</span></div>
                      </div>
                      <div className="admin-inline-controls">
                        <label>
                          Agreed project amount (₹)
                          <input
                            type="number"
                            min="0"
                            value={projectDrafts[consultation._id] ?? (consultation.agreedProjectAmount ?? '')}
                            onChange={(event) => setProjectDrafts((current) => ({
                              ...current,
                              [consultation._id]: event.target.value
                            }))}
                          />
                        </label>
                        <button className="admin-button secondary" type="button" disabled={savingId === consultation._id} onClick={() => saveProjectAmount(consultation)}>
                          Save agreed total
                        </button>
                      </div>
                      <div className="admin-payment-history">
                        <strong>Client payments</strong>
                        {linkedPayments.length === 0 ? (
                          <span className="admin-payment-empty">No client payments submitted yet.</span>
                        ) : linkedPayments.map((payment) => (
                          <div key={payment._id}>
                            <span className="admin-client-payment-details">
                              <strong>{paymentMilestoneStatus(payment)}</strong>
                              <small>
                                {currency(payment.amountPaid)}
                                {payment.createdAt ? ` · ${new Date(payment.createdAt).toLocaleDateString()}` : ''}
                                {payment.notes ? ` · Client reference: ${payment.notes}` : ''}
                              </small>
                            </span>
                            <span className="admin-client-payment-actions">
                              <span className={`admin-status ${String(payment.status || 'Pending').toLowerCase()}`}>
                                {payment.status || 'Pending'}
                              </span>
                              {payment.status === 'Pending' && (
                                <button
                                  className="admin-button secondary small"
                                  type="button"
                                  disabled={savingId === payment._id}
                                  onClick={() => handlePaymentStatus(payment, 'Completed')}
                                >
                                  {savingId === payment._id ? 'Saving…' : 'Mark completed'}
                                </button>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'portfolio' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">PUBLIC SHOWCASE</span><h2>Edit Portfolio</h2></div>
              <span>{portfolio.length} projects</span>
            </div>
            <form className="admin-form-grid" onSubmit={handlePortfolioSubmit}>
              <label>Project title<input required value={portfolioForm.title} onChange={(event) => setPortfolioForm({ ...portfolioForm, title: event.target.value })} /></label>
              <label>Category<select value={portfolioForm.category} onChange={(event) => setPortfolioForm({ ...portfolioForm, category: event.target.value })}>{portfolioCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Style<input required value={portfolioForm.style} onChange={(event) => setPortfolioForm({ ...portfolioForm, style: event.target.value })} /></label>
              <label>Designer<input value={portfolioForm.designerName} onChange={(event) => setPortfolioForm({ ...portfolioForm, designerName: event.target.value })} /></label>
              <label>Budget range<input value={portfolioForm.budgetRange} onChange={(event) => setPortfolioForm({ ...portfolioForm, budgetRange: event.target.value })} /></label>
              <label>Area<input value={portfolioForm.areaSize} onChange={(event) => setPortfolioForm({ ...portfolioForm, areaSize: event.target.value })} /></label>
              <label>Duration<input value={portfolioForm.duration} onChange={(event) => setPortfolioForm({ ...portfolioForm, duration: event.target.value })} /></label>
              <label className="wide-field">Image URLs (one per line)<textarea rows="3" value={portfolioForm.images} onChange={(event) => setPortfolioForm({ ...portfolioForm, images: event.target.value })} /></label>
              <label className="wide-field">Project description<textarea required rows="4" value={portfolioForm.description} onChange={(event) => setPortfolioForm({ ...portfolioForm, description: event.target.value })} /></label>
              <div className="wide-field admin-form-actions">
                <button className="admin-button" type="submit" disabled={savingId === 'portfolio-form'}>
                  {savingId === 'portfolio-form' ? 'Saving...' : editingPortfolioId ? 'Save portfolio changes' : 'Add portfolio project'}
                </button>
                {editingPortfolioId && <button className="admin-button secondary" type="button" onClick={() => { setEditingPortfolioId(''); setPortfolioForm(EMPTY_PORTFOLIO); }}>Cancel edit</button>}
              </div>
            </form>
            {!portfolio.length ? <div className="admin-empty">Portfolio has no saved projects yet.</div> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Project</th><th>Category & style</th><th>Designer</th><th>Budget</th><th>Actions</th></tr></thead>
                  <tbody>
                    {portfolio.map((project) => (
                      <tr key={project._id}>
                        <td><strong>{project.title}</strong></td>
                        <td>{project.category} · {project.style}</td>
                        <td>{project.designerName || '—'}</td>
                        <td>{project.budgetRange || '—'}</td>
                        <td className="admin-action-cell">
                          <button className="admin-button small secondary" type="button" onClick={() => startPortfolioEdit(project)}>Edit</button>
                          <button className="admin-button small danger" type="button" disabled={savingId === project._id} onClick={() => handlePortfolioDelete(project)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'products' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">STORE CATALOG</span><h2>Products & Stock</h2></div>
              <span>{products.length} products</span>
            </div>
            <form className="admin-form-grid compact" onSubmit={handleProductSubmit}>
              <label>Product name<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
              <label>Category<select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>{productCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Price (₹)<input required type="number" min="1" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
              <label>Images (one URL per line)<textarea rows="2" value={productForm.images} onChange={(event) => setProductForm({ ...productForm, images: event.target.value })} /></label>
              <label className="wide-field">Description<textarea required rows="2" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
              <div className="wide-field admin-form-actions">
                <label className="admin-checkbox"><input type="checkbox" checked={productForm.inStock} onChange={(event) => setProductForm({ ...productForm, inStock: event.target.checked })} /> In stock</label>
                <button className="admin-button" type="submit" disabled={savingId === 'product-form'}>{savingId === 'product-form' ? 'Saving...' : 'Add product'}</button>
              </div>
            </form>
            {!products.length ? <div className="admin-empty">No catalog products were returned by the server.</div> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock status</th><th>Action</th></tr></thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td><strong>{product.name}</strong></td>
                        <td>{product.category}</td>
                        <td>{currency(product.price)}</td>
                        <td><span className={`admin-status ${product.inStock ? 'completed' : 'refunded'}`}>{product.inStock ? 'In stock' : 'Out of stock'}</span></td>
                        <td><button className="admin-button small secondary" type="button" disabled={savingId === product._id} onClick={() => toggleProductStock(product)}>{product.inStock ? 'Mark out of stock' : 'Mark in stock'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'payments' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">PAYMENT VERIFICATION</span><h2>Online Project Payments</h2></div>
              <span>{payments.length} records</span>
            </div>
            <p className="admin-help">Client-submitted payments remain pending until the studio verifies receipt. Verified amounts update the linked project balance.</p>
            {!payments.length ? <div className="admin-empty">No online payment records have been submitted.</div> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Client / project</th><th>Submitted</th><th>Amount</th><th>Method / reference</th><th>Status</th><th>Verify</th><th>Client data</th></tr></thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id}>
                        <td><strong>{payment.clientName}</strong><br /><span>{payment.clientEmail}</span><br /><small>{payment.projectName}</small></td>
                        <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '—'}<br /><small>{payment.milestoneTitle}</small></td>
                        <td>{currency(payment.amountPaid)}<br /><small>Project total {currency(payment.totalProjectAmount)}</small></td>
                        <td>
                          {payment.paymentMethod || '—'}<br />
                          <small>{payment.transactionId}</small>
                          {payment.notes && <><br /><small>Client reference: {payment.notes}</small></>}
                        </td>
                        <td><span className={`admin-status ${String(payment.status || 'Pending').toLowerCase()}`}>{payment.status || 'Pending'}</span></td>
                        <td>
                          <select value={payment.status || 'Pending'} disabled={savingId === payment._id} aria-label={`Payment verification status for ${payment.clientEmail}`} onChange={(event) => handlePaymentStatus(payment, event.target.value)}>
                            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </td>
                        <td>
                          <button
                            className="admin-button danger small"
                            type="button"
                            disabled={savingId === `client:${String(payment.clientEmail || '').trim().toLowerCase()}`}
                            onClick={() => handleClearClientData(payment.clientEmail, payment.clientName)}
                          >
                            Clear all
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
