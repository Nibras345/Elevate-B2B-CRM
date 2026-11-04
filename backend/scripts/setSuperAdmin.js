import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function run() {
  const email = process.argv[2] || 'hafizyastor345@gmail.com';
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await mongoose.connection.collection('users').updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { role: 'Super Admin' } }
    );
    console.log(`Successfully updated ${email} to 'Super Admin'. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  } catch (err) {
    console.error('Error updating user:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

