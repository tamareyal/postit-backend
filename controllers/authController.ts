import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import UserModel from '../models/users';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const generateToken = (userId: string): { token: string; refreshToken: string } => {
    const secretKey: jwt.Secret = process.env.JWT_SECRET  || 'defaultSecretKey';
    const tokenExp: number = Number(process.env.JWT_EXPIRES_IN)  || 3000;
    const refTokenExp: number = Number(process.env.REFRESH_TOKEN_EXPIRES_IN) || 86400;

    const token = jwt.sign({ 
        userId: userId, 
        tokenType: 'access', 
        nonce: Math.random().toString(36).substring(2, 15) }, 
        secretKey, 
        { expiresIn: tokenExp }
    );
    const refreshToken = jwt.sign({ 
        userId: userId, 
        tokenType: 'refresh', 
        nonce: Math.random().toString(36).substring(2, 15) }, 
        secretKey, 
        { expiresIn: refTokenExp }
    );

    return { token, refreshToken };
}


const register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {

        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email already exists'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await UserModel.create({
                name: username,
                email,
                password: hashedPassword,
                refreshTokens: []
            });
        const tokens = generateToken(user._id.toString());
        user.refreshTokens.push(tokens.refreshToken);
        await user.save();
        return res.status(201).json({ ...tokens, userId: user._id.toString()});
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
}


const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Identifier and password are required' });
    }

    try {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        const query = isEmail
            ? { email: identifier }
            : { name: identifier };

        const user = await UserModel.findOne(query);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(400).json({
                message: 'This account uses Google login'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const tokens = generateToken(user._id.toString());

        user.refreshTokens.push(tokens.refreshToken);
        await user.save();
        return res.status(200).json({ ...tokens, userId: user._id.toString() });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
}


const googleLogin = async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential)
        return res.status(400).json({ message: 'Google credential required' });

    try {

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload)
            return res.status(401).json({ message: 'Invalid Google token' });

        const email = payload.email;
        const name = payload.name;
        const googleId = payload.sub;

        let user = await UserModel.findOne({ email });

        if (!user) {

            user = await UserModel.create({
                name,
                email,
                googleId
            });

        } else {

            if (user.googleId && user.googleId !== googleId) {
                return res.status(400).json({ message: 'Email already linked to another Google account' });
            }

            // link google account if missing
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }

        const tokens = generateToken(user._id.toString());

        user.refreshTokens.push(tokens.refreshToken);
        await user.save();

        return res.status(200).json({
            ...tokens,
            userId: user._id.toString()
        });

    } catch (error) {
        console.error('Google login error:', error);
        return res.status(401).json({
            message: 'Google authentication failed'
        });
    }
};

const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    try {
        const secretKey: jwt.Secret = process.env.JWT_SECRET  || 'defaultSecretKey';
        const decoded: jwt.JwtPayload = jwt.verify(refreshToken, secretKey) as jwt.JwtPayload;
        const userId = decoded.userId;

        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }
        
        const user = await UserModel.findById(userId);
        if (!user)
            return res.status(401).json({ message: 'Invalid refresh token' })
        if (!user.refreshTokens.includes(refreshToken)) {
            user.refreshTokens = [];
            await user.save();
            return res.status(403).json({ message: 'Refresh token reuse detected' });
        }

        const tokens = generateToken(user._id.toString());
        user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
        user.refreshTokens.push(tokens.refreshToken);
        await user.save();
        return res.status(200).json({ ...tokens, userId: user._id.toString() });
    }
    catch (error) {
        console.error('Error in refreshToken:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
}

const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
        const secretKey: jwt.Secret = process.env.JWT_SECRET  || 'defaultSecretKey';
        const decoded: jwt.JwtPayload = jwt.verify(refreshToken, secretKey) as jwt.JwtPayload;
        const userId = decoded.userId;

        const user = await UserModel.findById(userId);
        if (!user)
            return res.status(401).json({ message: 'Invalid refresh token' })
        
        user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
        await user.save();
        return res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Error in logout:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
}

const getMe = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthenticated' });
    }

    try {
        const user = await UserModel.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
}

export default {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    googleLogin,
    generateToken
};
