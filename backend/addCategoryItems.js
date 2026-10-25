const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Item = require('./models/Item');
const categoryAdditions = require('./categoryAdditions');

const renamedItems = [
  ['Indigo Fern Contemporary Wallpaper', 'Champagne Damask Accent Wallpaper'],
  ['Gilded Heritage Hallway Wallpaper', 'Monochrome Geo Triangle Accent Wallpaper'],
  ['Teal Geometric Handwoven Area Rug', 'Rust Kilim Geometric Area Rug']
];

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config();

const addCategoryItems = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required to add catalog items.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    for (const [oldName, newName] of renamedItems) {
      const updatedItem = categoryAdditions.find((item) => item.name === newName);
      if (updatedItem) {
        await Item.updateOne(
          { name: oldName, category: updatedItem.category },
          { $set: updatedItem }
        );
      }
    }

    const result = await Item.bulkWrite(
      categoryAdditions.map((item) => ({
        updateOne: {
          filter: { name: item.name, category: item.category },
          update: { $setOnInsert: item },
          upsert: true
        }
      }))
    );
    const matchingItems = await Item.find(
      { name: { $in: categoryAdditions.map((item) => item.name) } },
      'name'
    ).lean();
    const legacyItems = await Item.countDocuments({
      name: { $in: renamedItems.map(([oldName]) => oldName) }
    });
    if (matchingItems.length !== categoryAdditions.length || legacyItems !== 0) {
      throw new Error(`Catalog verification failed: ${matchingItems.length}/${categoryAdditions.length} current items; ${legacyItems} legacy names remain.`);
    }
    console.log(`Catalog migration verified: ${matchingItems.length} items present, ${result.upsertedCount} newly added, no duplicate legacy names.`);
  } finally {
    await mongoose.disconnect();
  }
};

addCategoryItems().catch((error) => {
  console.error('Failed to add category catalog items:', error);
  process.exitCode = 1;
});
