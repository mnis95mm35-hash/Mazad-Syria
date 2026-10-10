import axios from 'axios';

export const shamCash = axios.create({
  baseURL: 'https://api.shamcash.com/v1', 
  headers: {
    'Authorization': Bearer ${process.env.SHAM_CASH_API_KEY},
    'Merchant-ID': process.env.SHAM_CASH_MERCHANT_ID,
    'Content-Type': 'application/json',
  },
});

export const isMockPayment = process.env.SHAM_CASH_MOCK === 'true';