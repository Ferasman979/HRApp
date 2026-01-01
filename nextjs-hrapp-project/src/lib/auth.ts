
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/src/lib/models/User";
import dbConnect from "@/src/lib/services/db";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                await dbConnect();
                // Find user by username
                const user = await User.findOne({ username: credentials.username });

                if (user && (await user.comparePassword(credentials.password))) {
                    // Return user object including username
                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.username,
                        username: user.username
                    };
                }

                return null;
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.username = token.username as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
