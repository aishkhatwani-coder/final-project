const Item = require('../models/Item');

// Verified High-Res Image Mapping for Broken / Unreachable Links
const IMAGE_REPLACEMENTS = {
  'Milano 3-Door Sliding Tinted Mirror Wardrobe': [
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/14613158/pexels-photo-14613158.jpeg?auto=compress&cs=tinysrgb&w=1000'
  ],
  'Scandi Bouclé Ergonomic Accent Lounge Chair': [
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80'
  ]
};

// Helper: Sanitize image URLs before sending to frontend
const sanitizeItemImages = (itemDoc) => {
  const item = itemDoc.toObject ? itemDoc.toObject() : { ...itemDoc };

  // Check by name or title
  const itemName = item.name || item.title || '';
  for (const [key, validUrls] of Object.entries(IMAGE_REPLACEMENTS)) {
    if (itemName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(itemName.toLowerCase())) {
      item.images = validUrls;
      item.image = validUrls[0];
      if (itemName.includes('Milano')) {
        item.imageAttribution = {
          title: 'Reflection of Beds on Mirrors',
          creator: 'Hiba Q. Omar',
          sourceUrl: 'https://www.pexels.com/photo/reflection-of-beds-on-mirrors-14613158/',
          licenseUrl: 'https://www.pexels.com/license/',
          licenseName: 'Pexels License'
        };
      }
      return item;
    }
  }

  // Fallback if images array is empty or first item is broken
  if (!item.images || item.images.length === 0 || !item.images[0]) {
    item.images = ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'];
  }
  item.image = item.images[0];
  return item;
};

// GET all items with category filter, search, sorting
exports.getAllItems = async (req, res) => {
  try {
    const { category, search, q, sort, featured, inStock } = req.query;
    let filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (inStock === 'true') {
      filter.inStock = true;
    }

    const searchTerm = search || q;
    if (searchTerm) {
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { material: { $regex: searchTerm, $options: 'i' } },
        { color: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    let query = Item.find(filter);

    if (sort === 'price_asc') {
      query = query.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      query = query.sort({ price: -1 });
    } else if (sort === 'rating') {
      query = query.sort({ rating: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const items = await query.exec();

    // Automatically sanitize broken image URLs for frontend display
    const sanitizedItems = items.map(sanitizeItemImages);

    res.status(200).json(sanitizedItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Failed to retrieve items', error: error.message });
  }
};

// GET single item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json(sanitizeItemImages(item));
  } catch (error) {
    console.error('Error fetching item by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve item', error: error.message });
  }
};

// CREATE new item (Admin)
exports.createItem = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      originalPrice,
      dimensions,
      material,
      color,
      leadTime,
      images,
      description,
      features,
      featured,
      inStock
    } = req.body;

    if (!name || !category || !price || !description) {
      return res.status(400).json({ message: 'Name, category, price, and description are required.' });
    }

    const newItem = new Item({
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      dimensions: dimensions || '',
      material: material || '',
      color: color || '',
      leadTime: leadTime || '3-5 Business Days',
      images: Array.isArray(images) ? images : (images ? [images] : []),
      description: description.trim(),
      features: Array.isArray(features) ? features : (features ? [features] : []),
      featured: Boolean(featured),
      inStock: inStock !== undefined ? Boolean(inStock) : true
    });

    const saved = await newItem.save();
    res.status(201).json({ message: 'Item added successfully', item: sanitizeItemImages(saved) });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Failed to create item', error: error.message });
  }
};

// UPDATE item
exports.updateItem = async (req, res) => {
  try {
    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json({ message: 'Item updated successfully', item: sanitizeItemImages(updated) });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Failed to update item', error: error.message });
  }
};

// DELETE item
exports.deleteItem = async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Failed to delete item', error: error.message });
  }
};