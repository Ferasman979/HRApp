import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "HR App Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                await dbConnect();

                // Find user by username
                const user = await User.findOne({ username: credentials.username });

                if (!user) {
                    return null;
                }

                // Compare password (the model method handles bcrypt compare)
                const isValid = await (user as any).comparePassword(credentials.password);

                if (!isValid) {
                    return null;
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.username,
                };
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user) {
                // Add custom properties if needed
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
