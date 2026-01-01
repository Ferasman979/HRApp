import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || '', {
            dbName: 'hrapp'
        });
        console.log(`MongoDB Connected: ${conn.connection.host} (DB: hrapp)`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
