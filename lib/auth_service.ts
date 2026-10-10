import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (e) {
    return null;
  }
}