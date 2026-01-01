import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/src/lib/services/db";
import User from "@/src/lib/models/User";

export async function POST(req: Request) {
    try {
        const { username, email, password } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json(
                { message: "All fields are required." },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email or username already exists." },
                { status: 409 }
            );
        }

        // Create new user
        // Password hashing is handled by the pre-save hook in User model
        await User.create({
            username,
            email,
            password,
        });

        return NextResponse.json(
            { message: "User registered." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "An error occurred while registering the user." },
            { status: 500 }
        );
    }
}
