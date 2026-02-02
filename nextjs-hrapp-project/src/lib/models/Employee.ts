import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployee extends Document {
    email: string;
    name: string;
    role: string;
    department?: string;
    demographics: {
        gender?: string;
        ethnicity?: string;
        disability?: string; // e.g., "Yes", "No", or specific type
        veteranStatus?: string;
        // Add more as needed for grants
        ageGroup?: string;
        education?: string;
    };
    updatedAt: Date;
}

const EmployeeSchema: Schema<IEmployee> = new Schema(
    {
        email: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
        department: { type: String },
        demographics: {
            gender: String,
            ethnicity: String,
            disability: String,
            veteranStatus: String,
            ageGroup: String,
            education: String
        }
    },
    { timestamps: true }
);

// Prevent overwriting the model if it already exists
const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
