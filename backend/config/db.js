import mongoose from 'mongoose';
import dns from 'dns';

// Fix Node.js libuv resolver bug on Windows/ISP routers failing to resolve SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
