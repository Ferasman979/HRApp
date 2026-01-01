import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the Schema
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});

// Middleware to hash password BEFORE saving the user
UserSchema.pre('save', async function () {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10); // Generate salt with a cost factor of 10
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare the input password with the stored hash
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Prevent overwriting the model if it already exists
const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
