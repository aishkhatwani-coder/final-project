const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Item = require('./models/Item');
const Portfolio = require('./models/Portfolio');
const Payment = require('./models/Payment');
require('dotenv').config();
require('dotenv').config({
  path: require('path').join(__dirname, '.env.local'),
  override: true
});

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173,https://13.62.168.145'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

// Models
const Order = require('./models/Order');
const Consultation = require('./models/Consultation');
const User = require('./models/User');

const defaultPortfolioProjects = [
  {
    title: 'Minimalist Scandinavian Living Space',
    category: 'Living Room',
    style: 'Scandinavian',
    designerName: 'Aura Studio',
    images: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'],
    description: 'Clean aesthetic with organic textures, bespoke oak cabinetry, and warm neutral tones.',
    budgetRange: '₹12L - ₹15L',
    areaSize: '1,450 sq.ft',
    duration: '6 wks'
  },
  {
    title: 'Serene Japandi Master Suite',
    category: 'Bedroom',
    style: 'Minimalist',
    designerName: 'Studio Interior',
    images: ['https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80'],
    description: 'Harmonious fusion of Japanese minimalism and warm Scandinavian functionality.',
    budgetRange: '₹8L - ₹10L',
    areaSize: '550 sq.ft',
    duration: '4 wks'
  },
  {
    title: 'Bespoke Marble & Oak Culinary Space',
    category: 'Kitchen',
    style: 'Modern',
    designerName: 'Atelier Luxe',
    images: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'],
    description: 'Integrated smart appliances, brushed brass hardware, and waterfall marble island.',
    budgetRange: '₹15L - ₹18L',
    areaSize: '420 sq.ft',
    duration: '5 wks'
  },
  {
    title: 'Executive Penthouse Atelier',
    category: 'Office',
    style: 'Industrial',
    designerName: 'Studio Director',
    images: ['https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'],
    description: 'Acoustic architectural paneling with panoramic views and customized walnut millwork.',
    budgetRange: '₹6L - ₹9L',
    areaSize: '380 sq.ft',
    duration: '3 wks'
  }
];

// MongoDB Database Connection & Auto Seed
const mongoURI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/interior-studio';

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully');

    try {
      // Seed Orders
      const count = await Order.countDocuments();
      if (count === 0) {
        console.log('📦 Seeding sample client orders...');
        await Order.create([
          {
            orderNumber: 'ORD-099640-1978',
            clientName: 'rahul',
            customerName: 'rahul',
            clientEmail: 'rahul@gmail.com',
            customerEmail: 'rahul@gmail.com',
            userEmail: 'rahul@gmail.com',
            shippingAddress: { street: '402', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
            paymentMethod: 'UPI / QR Code',
            totalAmount: 4499,
            orderStatus: 'Processing',
            status: 'Processing',
            items: [
              {
                name: 'Aura Brushed Brass & Ceramic Table Lamp',
                title: 'Aura Brushed Brass & Ceramic Table Lamp',
                price: 4499,
                quantity: 1
              }
            ]
          },
          {
            orderNumber: 'ORD-922271-2914',
            clientName: 'rahul',
            customerName: 'rahul',
            clientEmail: 'rahul@gmail.com',
            customerEmail: 'rahul@gmail.com',
            userEmail: 'rahul@gmail.com',
            shippingAddress: { street: '403 mumbai', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
            paymentMethod: 'UPI / QR Code',
            totalAmount: 38500,
            orderStatus: 'Processing',
            status: 'Processing',
            items: [
              {
                name: 'Architectural Teak Lounge Armchair',
                title: 'Architectural Teak Lounge Armchair',
                price: 38500,
                quantity: 1
              }
            ]
          }
        ]);
        console.log('✅ Sample orders seeded successfully!');
      }

      const portfolioCount = await Portfolio.countDocuments();
      if (portfolioCount === 0) {
        await Portfolio.insertMany(defaultPortfolioProjects);
        console.log('✅ Default portfolio projects saved to the database.');
      }
    } catch (seedErr) {
      console.error('Auto seed error:', seedErr);
    }
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ================= AUTH ROUTES =================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Account not found.' });

    req.auth = {
      id: String(user._id),
      email: user.email,
      role: user.role
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  next();
};

// ================= CONSULTATION ROUTES =================
app.post('/api/consultations', async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      propertyType,
      roomType,
      preferredStyle,
      budgetRange,
      areaSize,
      preferredDate,
      preferredTimeSlot,
      consultationMode,
      preferredArchitect,
      notes,
      referenceProject,
      referenceProjectTitle
    } = req.body;

    const name = String(clientName || '').trim();
    const email = String(clientEmail || '').trim().toLowerCase();
    const phone = String(clientPhone || '').trim();
    const room = String(roomType || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !room) {
      return res.status(400).json({
        message: 'Name, valid email, phone number, and room type are required.'
      });
    }

    const validDate = preferredDate ? new Date(preferredDate) : undefined;
    if (preferredDate && Number.isNaN(validDate.getTime())) {
      return res.status(400).json({ message: 'Please provide a valid preferred date.' });
    }
    if (referenceProject && !/^[a-f\d]{24}$/i.test(String(referenceProject))) {
      return res.status(400).json({ message: 'The selected portfolio project is invalid.' });
    }

    const consultation = await Consultation.create({
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      propertyType,
      roomType: room,
      preferredStyle,
      budgetRange,
      areaSize,
      preferredDate: validDate,
      preferredTimeSlot,
      consultationMode,
      preferredArchitect,
      notes,
      referenceProject,
      referenceProjectTitle
    });

    return res.status(201).json({
      message: 'Consultation request submitted successfully.',
      consultation
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    return res.status(500).json({ message: 'Unable to submit your consultation request right now.' });
  }
});

app.get('/api/consultations', authenticate, async (req, res) => {
  try {
    const filter = req.auth.role === 'admin'
      ? {}
      : { clientEmail: req.auth.email };
    const consultations = await Consultation.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(consultations);
  } catch (error) {
    console.error('Fetch consultations error:', error);
    return res.status(500).json({ message: 'Unable to fetch consultation requests right now.' });
  }
});

app.patch('/api/consultations/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const validStatuses = [
      'Pending',
      'Meeting Arranged',
      'Site Visit Scheduled',
      'In Progress',
      'Completed',
      'Cancelled',
      'Contacted',
      'Confirmed'
    ];
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Select a valid consultation status.' });
    }

    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation request not found.' });
    }
    return res.status(200).json({ message: 'Consultation status updated.', consultation });
  } catch (error) {
    console.error('Update consultation status error:', error);
    return res.status(500).json({ message: 'Unable to update consultation status right now.' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Registration is temporarily unavailable because the database is not connected. Please contact the site administrator.'
    });
  }

  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim();

    if (!name || !email || password.length < 8) {
      return res.status(400).json({ message: 'Name, valid email, and a password of at least 8 characters are required.' });
    }

    const usersCollection = mongoose.connection.collection('users');
    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      phone: phone || undefined,
      role: 'client',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(201).json({ message: 'Account created. Please sign in.' });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Unable to create account right now.' });
  }
});

// 1. POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const usersCollection = mongoose.connection.collection('users');
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || 'client' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      _id: user._id,
      name: user.name || 'User',
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'client'
    };

    return res.status(200).json({
      success: true,
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// 2. GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const usersCollection = mongoose.connection.collection('users');
    const user = await usersCollection.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'client'
    });
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid token' });
  }
});

// ================= CATALOG & PORTFOLIO ROUTES =================
app.get('/api/portfolio', async (req, res) => {
  try {
    const filter = {};
    for (const field of ['category', 'style']) {
      if (typeof req.query[field] === 'string' && req.query[field].trim()) {
        filter[field] = req.query[field].trim();
      }
    }
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['title', 'description', 'designerName', 'category', 'style']
        .map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const projects = await Portfolio.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(projects);
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    return res.status(500).json({ message: 'Unable to fetch portfolio projects.' });
  }
});

app.get('/api/portfolio/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Portfolio project not found.' });
    }
    const project = await Portfolio.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Portfolio project not found.' });
    return res.status(200).json(project);
  } catch (error) {
    console.error('Fetch portfolio project error:', error);
    return res.status(500).json({ message: 'Unable to fetch this portfolio project.' });
  }
});

const portfolioFields = [
  'title',
  'category',
  'style',
  'description',
  'images',
  'budgetRange',
  'areaSize',
  'duration',
  'designerName'
];
const normalizePortfolioInput = (body) => {
  const data = {};
  for (const field of portfolioFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (typeof data.images === 'string') {
    data.images = data.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  }
  return data;
};

app.post('/api/portfolio', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = normalizePortfolioInput(req.body);
    const saved = await Portfolio.create(data);
    return res.status(201).json(saved);
  } catch (error) {
    console.error('Create portfolio project error:', error);
    return res.status(400).json({ message: 'Unable to save portfolio project. Check required fields and image URLs.' });
  }
});

app.put('/api/portfolio/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Portfolio project not found.' });
    }
    const updated = await Portfolio.findByIdAndUpdate(
      req.params.id,
      { $set: normalizePortfolioInput(req.body) },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Portfolio project not found.' });
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Update portfolio project error:', error);
    return res.status(400).json({ message: 'Unable to update portfolio project. Check required fields and image URLs.' });
  }
});

app.delete('/api/portfolio/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Portfolio project not found.' });
    }
    const deleted = await Portfolio.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Portfolio project not found.' });
    return res.status(200).json({ message: 'Portfolio project deleted.' });
  } catch (error) {
    console.error('Delete portfolio project error:', error);
    return res.status(500).json({ message: 'Unable to delete portfolio project.' });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const filter = {};
    if (typeof req.query.category === 'string' && req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.inStock === 'true') filter.inStock = true;
    if (req.query.inStock === 'false') filter.inStock = false;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['name', 'description', 'material', 'color', 'category']
        .map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const sort = req.query.sort === 'price_asc'
      ? { price: 1 }
      : req.query.sort === 'price_desc'
        ? { price: -1 }
        : req.query.sort === 'rating'
          ? { rating: -1 }
          : { createdAt: -1 };
    const items = await Item.find(filter).sort(sort);
    return res.status(200).json(items);
  } catch (error) {
    console.error('Fetch items error:', error);
    return res.status(500).json({ message: 'Unable to fetch products.' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product not found.' });
    return res.status(200).json(item);
  } catch (error) {
    console.error('Fetch item error:', error);
    return res.status(500).json({ message: 'Unable to fetch this product.' });
  }
});

app.post('/api/items', authenticate, requireAdmin, async (req, res) => {
  try {
    const item = await Item.create(req.body);
    return res.status(201).json({ message: 'Product created.', item });
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(400).json({ message: 'Unable to create product. Check the product details.' });
  }
});

app.put('/api/items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const allowedFields = [
      'name', 'category', 'price', 'originalPrice', 'dimensions',
      'material', 'color', 'inStock', 'leadTime', 'images',
      'description', 'features', 'featured'
    ];
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (typeof update.inStock !== 'undefined' && typeof update.inStock !== 'boolean') {
      return res.status(400).json({ message: 'Product stock status must be true or false.' });
    }
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Product not found.' });
    return res.status(200).json({ message: 'Product updated.', item });
  } catch (error) {
    console.error('Update item error:', error);
    return res.status(400).json({ message: 'Unable to update product. Check the product details.' });
  }
});

app.delete('/api/items/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found.' });
    return res.status(200).json({ message: 'Product deleted.' });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({ message: 'Unable to delete product.' });
  }
});

app.put('/api/consultations/:id/financials', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Consultation request not found.' });
    }
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation request not found.' });
    }

    const amountWasProvided = req.body.agreedProjectAmount !== undefined;
    const agreedAmount = amountWasProvided
      ? Number(req.body.agreedProjectAmount)
      : consultation.agreedProjectAmount;
    if (amountWasProvided && (!Number.isFinite(agreedAmount) || agreedAmount < 0)) {
      return res.status(400).json({ message: 'Enter a valid agreed project amount.' });
    }

    const linkedPayments = await Payment.find({
      consultationId: consultation._id,
      status: 'Completed'
    }).select('amountPaid');
    const onlineReceived = linkedPayments.reduce((sum, entry) => sum + entry.amountPaid, 0);
    if (Number.isFinite(agreedAmount) && agreedAmount > 0 && onlineReceived > agreedAmount) {
      return res.status(400).json({
        message: 'Agreed amount cannot be less than payments already recorded.'
      });
    }

    if (amountWasProvided) consultation.agreedProjectAmount = agreedAmount;
    await consultation.save();
    return res.status(200).json({
      message: 'Project payment details saved.',
      consultation
    });
  } catch (error) {
    console.error('Update consultation financials error:', error);
    return res.status(500).json({ message: 'Unable to save project payment details right now.' });
  }
});

// ================= PAYMENT ROUTES =================
app.post('/api/payments', authenticate, async (req, res) => {
  try {
    if (req.auth.role !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can submit payments.' });
    }
    const amountPaid = Number(req.body.amountPaid);
    const totalProjectAmount = Number(req.body.totalProjectAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 ||
        !Number.isFinite(totalProjectAmount) || totalProjectAmount <= 0) {
      return res.status(400).json({ message: 'Enter a valid project total and payment amount.' });
    }
    const consultationId = req.body.consultationId;
    let consultation;
    if (consultationId) {
      if (!/^[a-f\d]{24}$/i.test(String(consultationId))) {
        return res.status(400).json({ message: 'The consultation linked to this payment is invalid.' });
      }
      consultation = await Consultation.findOne({
        _id: consultationId,
        clientEmail: req.auth.email
      });
      if (!consultation) {
        return res.status(404).json({ message: 'The linked consultation was not found for this account.' });
      }
      if (!consultation.agreedProjectAmount || consultation.agreedProjectAmount !== totalProjectAmount) {
        return res.status(400).json({ message: 'The project total must match the agreed amount set by the studio.' });
      }
      const reservedPayments = await Payment.find({
        consultationId: consultation._id,
        status: { $in: ['Pending', 'Completed'] }
      }).select('amountPaid');
      const alreadyReserved = reservedPayments.reduce((sum, entry) => sum + entry.amountPaid, 0);
      if (alreadyReserved + amountPaid > consultation.agreedProjectAmount) {
        return res.status(400).json({ message: 'Payment amount exceeds the remaining project balance.' });
      }
    }

    const timestamp = Date.now().toString().slice(-6);
    const randomHex = Math.floor(Math.random() * 8999 + 1000);
    const payment = await Payment.create({
      clientName: String(req.body.clientName || '').trim().slice(0, 120),
      clientEmail: req.auth.email,
      clientPhone: String(req.body.clientPhone || '').trim().slice(0, 50),
      projectName: String(req.body.projectName || 'Bespoke Interior Renovation').trim().slice(0, 160),
      designerName: String(req.body.designerName || '').trim().slice(0, 120),
      totalProjectAmount,
      milestoneTitle: String(req.body.milestoneTitle || 'Project installment').trim().slice(0, 160),
      amountPaid,
      paymentMethod: req.body.paymentMethod,
      transactionId: `TXN-${timestamp}-${randomHex}`,
      receiptNumber: `INV-${new Date().getFullYear()}-${timestamp}-${randomHex}`,
      status: 'Pending',
      notes: String(req.body.notes || '').trim().slice(0, 500),
      userId: req.auth.id,
      consultationId: consultation?._id
    });
    return res.status(201).json({
      message: 'Payment submitted for studio verification.',
      payment
    });
  } catch (error) {
    console.error('Create payment request error:', error);
    return res.status(400).json({ message: 'Unable to submit payment. Check the details and try again.' });
  }
});

app.get('/api/payments', authenticate, async (req, res) => {
  try {
    const filter = req.auth.role === 'admin'
      ? {}
      : { clientEmail: req.auth.email };
    const payments = await Payment.find(filter)
      .populate('consultationId', 'roomType propertyType agreedProjectAmount')
      .sort({ createdAt: -1 });
    const totalCollected = payments.reduce(
      (sum, payment) => sum + (payment.status === 'Completed' ? payment.amountPaid : 0),
      0
    );
    return res.status(200).json({ count: payments.length, totalCollected, payments });
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ message: 'Unable to fetch payment records.' });
  }
});

app.patch('/api/payments/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowedStatuses = ['Pending', 'Completed', 'Failed', 'Refunded'];
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Select a valid payment status.' });
    }
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    if (status === 'Completed' && payment.consultationId) {
      const consultation = await Consultation.findById(payment.consultationId);
      if (!consultation) {
        return res.status(409).json({ message: 'The linked consultation no longer exists.' });
      }
      const completed = await Payment.find({
        consultationId: consultation._id,
        status: 'Completed',
        _id: { $ne: payment._id }
      }).select('amountPaid');
      const onlineReceived = completed.reduce((sum, entry) => sum + entry.amountPaid, 0);
      if (!consultation.agreedProjectAmount ||
          onlineReceived + payment.amountPaid > consultation.agreedProjectAmount) {
        return res.status(400).json({ message: 'Payment cannot be verified above the remaining agreed project balance.' });
      }
    }

    payment.status = status;
    await payment.save();
    return res.status(200).json({ message: 'Payment status updated.', payment });
  } catch (error) {
    console.error('Update payment status error:', error);
    return res.status(500).json({ message: 'Unable to update payment status.' });
  }
});

// ================= ORDERS ROUTES =================
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const filter = req.auth.role === 'admin' ? {} : { clientEmail: req.auth.email };
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', authenticate, async (req, res) => {
  try {
    if (req.auth.role !== 'client') {
      return res.status(403).json({ message: 'Only customer accounts can place orders.' });
    }

    const { clientName, clientPhone, items, shippingAddress, paymentMethod, notes } = req.body;
    if (!clientName || !clientPhone || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ message: 'Customer details and a valid list of items are required.' });
    }
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.pincode) {
      return res.status(400).json({ message: 'A complete delivery address is required.' });
    }

    const quantitiesByItemId = new Map();
    for (const entry of items) {
      const itemId = String(entry?.itemId || '');
      const quantity = Number(entry?.quantity);
      if (!/^[a-f\d]{24}$/i.test(itemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({ message: 'Each order item must have a valid item ID and quantity.' });
      }
      quantitiesByItemId.set(itemId, (quantitiesByItemId.get(itemId) || 0) + quantity);
    }

    const catalogItems = await Item.find({
      _id: { $in: [...quantitiesByItemId.keys()] },
      inStock: true
    });
    if (catalogItems.length !== quantitiesByItemId.size) {
      return res.status(400).json({ message: 'One or more items are unavailable. Refresh the catalog and try again.' });
    }

    const catalogById = new Map(catalogItems.map((item) => [String(item._id), item]));
    const trustedItems = [...quantitiesByItemId.entries()].map(([itemId, quantity]) => {
      const item = catalogById.get(itemId);
      return {
        itemId: item._id,
        name: item.name,
        price: item.price,
        quantity,
        image: item.images?.[0] || '',
        category: item.category,
        material: item.material || '',
        dimensions: item.dimensions || ''
      };
    });
    const trustedTotal = trustedItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const normalizedPaymentMethod = paymentMethod || 'UPI / QR Code';
    const allowedPaymentMethods = ['UPI / QR Code', 'Credit / Debit Card', 'Net Banking', 'Cash on Delivery'];
    if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: 'Select a supported payment method.' });
    }

    const timestamp = Date.now().toString().slice(-6);
    const randomId = Math.floor(Math.random() * 9000 + 1000);
    const isCashOnDelivery = normalizedPaymentMethod === 'Cash on Delivery';
    const order = await Order.create({
      orderNumber: `ORD-${timestamp}-${randomId}`,
      items: trustedItems,
      totalAmount: trustedTotal,
      clientName: String(clientName).trim(),
      clientEmail: req.auth.email,
      clientPhone: String(clientPhone).trim(),
      shippingAddress: {
        street: String(shippingAddress.street).trim(),
        city: String(shippingAddress.city).trim(),
        state: String(shippingAddress.state || '').trim() || 'Maharashtra',
        pincode: String(shippingAddress.pincode).trim()
      },
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: isCashOnDelivery ? 'Cash on Delivery' : 'Pending',
      orderStatus: 'Processing',
      receiptNumber: `INV-ITEM-${new Date().getFullYear()}-${timestamp}-${randomId}`,
      transactionId: `${isCashOnDelivery ? 'COD' : 'PENDING'}-${timestamp}-${randomId}`,
      userId: req.auth.id,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : ''
    });

    return res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ message: 'Unable to place your order right now.' });
  }
});

app.patch('/api/orders/:idOrNumber/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const { status } = req.body;

    const validStages = ['Processing', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled'];
    if (!validStages.includes(status)) {
      return res.status(400).json({ error: 'Invalid order stage' });
    }

    let query = { orderNumber: idOrNumber };
    if (idOrNumber.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ orderNumber: idOrNumber }, { _id: idOrNumber }] };
    }

    const updated = await Order.findOneAndUpdate(
      query,
      { $set: { status: status, orderStatus: status } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Order not found in database' });
    }

    return res.status(200).json({ success: true, order: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:idOrNumber/payment', authenticate, requireAdmin, async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const amountPaid = Number(req.body.amountPaid);
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      return res.status(400).json({ message: 'Enter a valid received amount.' });
    }

    const query = /^[a-f\d]{24}$/i.test(idOrNumber)
      ? { $or: [{ orderNumber: idOrNumber }, { _id: idOrNumber }] }
      : { orderNumber: idOrNumber };
    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (amountPaid > order.totalAmount) {
      return res.status(400).json({ message: 'Received amount cannot exceed the order total.' });
    }

    order.amountPaid = amountPaid;
    order.paymentStatus = amountPaid >= order.totalAmount
      ? 'Completed'
      : order.paymentMethod === 'Cash on Delivery' && amountPaid === 0
        ? 'Cash on Delivery'
        : 'Pending';
    await order.save();
    return res.status(200).json({ message: 'Order payment record updated.', order });
  } catch (error) {
    console.error('Update order payment error:', error);
    return res.status(500).json({ message: 'Unable to update order payment.' });
  }
});

app.delete('/api/orders/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.status(200).json({
      message: 'Order deleted.',
      orderId: String(deleted._id),
      clientEmail: deleted.clientEmail
    });
  } catch (error) {
    console.error('Delete order error:', error);
    return res.status(500).json({ message: 'Unable to delete order.' });
  }
});

app.delete('/api/clients/:email/data', authenticate, requireAdmin, async (req, res) => {
  try {
    const clientEmail = String(req.params.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return res.status(400).json({ message: 'Enter a valid client email address.' });
    }

    const escapedEmail = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const emailFilter = { $regex: `^${escapedEmail}$`, $options: 'i' };
    const consultations = await Consultation.find({ clientEmail: emailFilter }).select('_id');
    const consultationIds = consultations.map((consultation) => consultation._id);

    const deletedPayments = await Payment.deleteMany({
      $or: [
        { clientEmail: emailFilter },
        ...(consultationIds.length ? [{ consultationId: { $in: consultationIds } }] : [])
      ]
    });
    const deletedConsultations = await Consultation.deleteMany({ clientEmail: emailFilter });
    const deletedOrders = await Order.deleteMany({ clientEmail: emailFilter });

    return res.status(200).json({
      message: `Cleared all client records for ${clientEmail}.`,
      deleted: {
        orders: deletedOrders.deletedCount,
        consultations: deletedConsultations.deletedCount,
        payments: deletedPayments.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear client data error:', error);
    return res.status(500).json({ message: 'Unable to clear all client data.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
});