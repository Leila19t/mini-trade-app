import type { Exchange, Ticker } from "@mini-trade/contracts";

export interface StockDefinition {
  symbol: Ticker;
  name: string;
  exchange: Exchange;
  /** Price at the moment the engine starts. History is generated backwards from it. */
  price: number;
  /** Annualised volatility, e.g. 0.3 = 30%. Higher means bigger swings. */
  volatility: number;
  /** Annualised drift (expected return), e.g. 0.08 = 8% a year. */
  drift: number;
  sharesOutstanding: number;
  /** Typical shares traded per day. */
  averageVolume: number;
}

const B = 1_000_000_000;
const M = 1_000_000;

/**
 * Real tickers with simulated prices. Starting prices, volatility and share
 * counts are plausible ballpark figures, not market data.
 */
export const UNIVERSE: readonly StockDefinition[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", price: 231.42, volatility: 0.27, drift: 0.1, sharesOutstanding: 14.9 * B, averageVolume: 55 * M },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", price: 418.3, volatility: 0.25, drift: 0.1, sharesOutstanding: 7.43 * B, averageVolume: 21 * M },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", price: 131.88, volatility: 0.55, drift: 0.15, sharesOutstanding: 24.4 * B, averageVolume: 210 * M },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", price: 197.12, volatility: 0.32, drift: 0.1, sharesOutstanding: 10.6 * B, averageVolume: 40 * M },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", price: 171.05, volatility: 0.3, drift: 0.09, sharesOutstanding: 12.2 * B, averageVolume: 25 * M },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", price: 562.4, volatility: 0.38, drift: 0.12, sharesOutstanding: 2.52 * B, averageVolume: 14 * M },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", price: 248.77, volatility: 0.6, drift: 0.08, sharesOutstanding: 3.22 * B, averageVolume: 95 * M },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", price: 698.15, volatility: 0.4, drift: 0.1, sharesOutstanding: 0.43 * B, averageVolume: 3.5 * M },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", price: 142.6, volatility: 0.5, drift: 0.1, sharesOutstanding: 1.62 * B, averageVolume: 45 * M },
  { symbol: "PEP", name: "PepsiCo Inc.", exchange: "NASDAQ", price: 152.4, volatility: 0.16, drift: 0.04, sharesOutstanding: 1.37 * B, averageVolume: 6 * M },
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NASDAQ", price: 92.15, volatility: 0.18, drift: 0.08, sharesOutstanding: 8 * B, averageVolume: 18 * M },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", price: 221.64, volatility: 0.24, drift: 0.08, sharesOutstanding: 2.8 * B, averageVolume: 9 * M },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", price: 289.5, volatility: 0.2, drift: 0.08, sharesOutstanding: 1.95 * B, averageVolume: 6.5 * M },
  { symbol: "MA", name: "Mastercard Inc.", exchange: "NYSE", price: 512.3, volatility: 0.21, drift: 0.08, sharesOutstanding: 0.91 * B, averageVolume: 2.8 * M },
  { symbol: "KO", name: "The Coca-Cola Co.", exchange: "NYSE", price: 64.21, volatility: 0.15, drift: 0.04, sharesOutstanding: 4.3 * B, averageVolume: 13 * M },
  { symbol: "DIS", name: "The Walt Disney Co.", exchange: "NYSE", price: 112.8, volatility: 0.28, drift: 0.05, sharesOutstanding: 1.8 * B, averageVolume: 9 * M },
  { symbol: "NKE", name: "Nike Inc.", exchange: "NYSE", price: 72.35, volatility: 0.32, drift: 0.03, sharesOutstanding: 1.48 * B, averageVolume: 11 * M },
  { symbol: "BA", name: "The Boeing Co.", exchange: "NYSE", price: 168.9, volatility: 0.38, drift: 0.03, sharesOutstanding: 0.76 * B, averageVolume: 7 * M },
  { symbol: "XOM", name: "Exxon Mobil Corp.", exchange: "NYSE", price: 114.25, volatility: 0.25, drift: 0.05, sharesOutstanding: 4.3 * B, averageVolume: 15 * M },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE", price: 158.6, volatility: 0.16, drift: 0.04, sharesOutstanding: 2.41 * B, averageVolume: 7.5 * M },
];
