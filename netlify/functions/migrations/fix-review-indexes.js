/**
 * Migration Script: Fix Review Indexes
 * 
 * This script removes the old unique index on bookingId
 * and creates a new compound unique index on (bookingId, userId)
 * to allow users to review the same car across different bookings.
 * 
 * Run this script once to update the database indexes.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateReviewIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    const db = mongoose.connection.db;
    const reviewsCollection = db.collection('reviews');

    console.log('\nChecking existing indexes...');
    const existingIndexes = await reviewsCollection.indexes();
    console.log('Current indexes:', JSON.stringify(existingIndexes, null, 2));

    // Drop the old unique index on bookingId if it exists
    const indexesToDrop = ['bookingId_1', 'booking_1'];
    
    for (const indexName of indexesToDrop) {
      try {
        console.log(`\nDropping old ${indexName} unique index...`);
        await reviewsCollection.dropIndex(indexName);
        console.log(`✓ Successfully dropped ${indexName} index`);
      } catch (error) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          console.log(`ℹ ${indexName} index does not exist (already removed or never created)`);
        } else {
          console.error(`Error dropping ${indexName} index:`, error.message);
        }
      }
    }

    // Create new compound unique index on (bookingId, userId)
    try {
      console.log('\nCreating new compound unique index on (bookingId, userId)...');
      await reviewsCollection.createIndex(
        { bookingId: 1, userId: 1 },
        { unique: true, name: 'bookingId_1_userId_1' }
      );
      console.log('✓ Successfully created compound unique index');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('ℹ Compound index already exists');
      } else {
        console.error('Error creating index:', error.message);
      }
    }

    console.log('\nVerifying new indexes...');
    const updatedIndexes = await reviewsCollection.indexes();
    console.log('Updated indexes:', JSON.stringify(updatedIndexes, null, 2));

    console.log('\n✓ Migration completed successfully!');
    console.log('\nUsers can now submit reviews for the same car across different bookings.');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
if (require.main === module) {
  migrateReviewIndexes()
    .then(() => {
      console.log('\nMigration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateReviewIndexes;
