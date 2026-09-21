import axios from 'axios';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function getLivePrice(symbol: string): Promise<number | null> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    return parseFloat(response.data.price);
  } catch (error) {
    return null;
  }
}

async function startInteractiveCalculator() {
  console.log('\n==========================================');
  console.log('🚀 SPOT & FUTURE CRYPTO PROFIT CALCULATOR');
  console.log('==========================================\n');

  try {
    // 1. Trading Type Selection
    console.log('Trading Type Choose Karein:');
    console.log(' [1] Spot Trading');
    console.log(' [2] Future Trading');
    const tradeTypeChoice = await askQuestion('👉 Choice enter karein (1 ya 2): ');
    const isFuture = tradeTypeChoice.trim() === '2';

    // 2. Coin Name
    const rawSymbol = await askQuestion('\n1️⃣  Kon sa coin select karna chahte hain? (e.g. BTC, ETH, SOL): ');
    const symbol = rawSymbol.trim().toUpperCase();

    if (!symbol) {
      console.log('❌ Invalid Coin Name!');
      rl.close();
      return;
    }

    // Live Price Fetching
    console.log(`\n🔄 Binance se ${symbol} ka live rate fetch ho raha hai...`);
    const livePriceUSD = await getLivePrice(symbol);

    if (livePriceUSD) {
      console.log(`⚡ Live Market Price (${symbol}): $${livePriceUSD.toLocaleString()}`);
    } else {
      console.log(`⚠️ Live price fetch nahi ho saka, manual rate enter karein.`);
    }

    // Future Specific Options (Position & Leverage)
    let isLong = true;
    let leverage = 1;

    if (isFuture) {
      const positionChoice = await askQuestion('\n2️⃣  Position Type select karein:\n [1] Long (Price upar jane par profit)\n [2] Short (Price niche jane par profit)\n👉 Choice (1 ya 2): ');
      isLong = positionChoice.trim() !== '2';

      const levInput = await askQuestion('\n3️⃣  Leverage kitni rakhni hai? (e.g. 10x, 20x, 50x): ');
      leverage = parseFloat(levInput) || 1;
      if (leverage < 1) leverage = 1;
    }

    // Entry Price
    const entryInput = await askQuestion(
      `\n4️⃣  Kis Entry Rate ($) par trade open karein ge? ${livePriceUSD ? `(Default Live Rate: $${livePriceUSD})` : ''}: `
    );
    const entryPriceUSD = entryInput.trim() !== '' ? parseFloat(entryInput) : (livePriceUSD || 0);

    if (isNaN(entryPriceUSD) || entryPriceUSD <= 0) {
      console.log('❌ Invalid Entry Rate!');
      rl.close();
      return;
    }

    // Investment / Margin Amount
    const investmentInput = await askQuestion(`\n5️⃣  Kitne Dollar ($) ${isFuture ? 'Margin/Wallet Capital' : 'Investment'} me use karein ge? $`);
    const marginUSD = parseFloat(investmentInput);

    if (isNaN(marginUSD) || marginUSD <= 0) {
      console.log('❌ Invalid Amount!');
      rl.close();
      return;
    }

    // Target Exit Price
    const exitInput = await askQuestion('\n6️⃣  Kis Target Rate ($) par trade CLOSE/SALE karein ge? $');
    const exitPriceUSD = parseFloat(exitInput);

    if (isNaN(exitPriceUSD) || exitPriceUSD <= 0) {
      console.log('❌ Invalid Target Exit Price!');
      rl.close();
      return;
    }

    // USD to PKR Rate
    const pkrInput = await askQuestion('\n7️⃣  Current USD to PKR Rate enter karein (Default: 278.5): ');
    const usdToPkrRate = pkrInput.trim() !== '' ? parseFloat(pkrInput) : 278.5;

    // ==========================================
    // CALCULATIONS
    // ==========================================
    const totalPositionSizeUSD = marginUSD * leverage;
    const coinsPurchased = totalPositionSizeUSD / entryPriceUSD;

    let profitUSD = 0;
    let liquidationPriceUSD = 0;

    if (!isFuture) {
      // SPOT CALCULATION
      const futureValueUSD = coinsPurchased * exitPriceUSD;
      profitUSD = futureValueUSD - marginUSD;
    } else {
      // FUTURE CALCULATION
      if (isLong) {
        profitUSD = (exitPriceUSD - entryPriceUSD) * coinsPurchased;
        // Approx Liquidation Price for Long (Isolated)
        liquidationPriceUSD = entryPriceUSD * (1 - 1 / leverage);
      } else {
        profitUSD = (entryPriceUSD - exitPriceUSD) * coinsPurchased;
        // Approx Liquidation Price for Short (Isolated)
        liquidationPriceUSD = entryPriceUSD * (1 + 1 / leverage);
      }
    }

    const returnOnEquityPercentage = (profitUSD / marginUSD) * 100;
    const marginPKR = marginUSD * usdToPkrRate;
    const profitPKR = profitUSD * usdToPkrRate;
    const totalReturnUSD = marginUSD + profitUSD;
    const totalReturnPKR = totalReturnUSD * usdToPkrRate;

    // ==========================================
    // DISPLAY RESULTS
    // ==========================================
    console.log('\n==========================================');
    console.log(`📊 ${isFuture ? 'FUTURE TRADING' : 'SPOT TRADING'} SUMMARY FOR ${symbol}`);
    console.log('==========================================');
    if (livePriceUSD) {
      console.log(`⚡ Live Market Rate   : $${livePriceUSD.toLocaleString()}`);
    }
    console.log(`📌 Trade Type         : ${isFuture ? `Future (${isLong ? 'LONG 📈' : 'SHORT 📉'} ${leverage}x)` : 'SPOT Purchase 🛒'}`);
    console.log(`🏷️ Entry Rate         : $${entryPriceUSD.toLocaleString()} (Rs. ${(entryPriceUSD * usdToPkrRate).toLocaleString()})`);
    console.log(`🎯 Target Exit Rate   : $${exitPriceUSD.toLocaleString()} (Rs. ${(exitPriceUSD * usdToPkrRate).toLocaleString()})`);
    
    if (isFuture) {
      console.log(`💥 Est. Liquidation   : $${liquidationPriceUSD.toFixed(2)} (Caution Price)`);
    }

    console.log('------------------------------------------');
    console.log(`💰 Your Margin/Capital: $${marginUSD} (Rs. ${marginPKR.toLocaleString()})`);
    if (isFuture) {
      console.log(`🔍 Total Position Size: $${totalPositionSizeUSD.toLocaleString()} (${leverage}x Exposure)`);
    }
    console.log(`🪙 Total Coin Volume  : ${coinsPurchased.toFixed(6)} ${symbol}`);
    console.log('------------------------------------------');
    console.log(`📈 Future Total Return: $${totalReturnUSD.toFixed(2)} (Rs. ${totalReturnPKR.toLocaleString(undefined, { maximumFractionDigits: 2 })})`);
    console.log(`🚀 Estimated PnL      : ${profitUSD >= 0 ? '+' : ''}$${profitUSD.toFixed(2)} (Rs. ${profitPKR.toLocaleString(undefined, { maximumFractionDigits: 2 })})`);
    console.log(`📊 Return on Margin   : ${returnOnEquityPercentage >= 0 ? '+' : ''}${returnOnEquityPercentage.toFixed(2)}%`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    rl.close();
  }
}

startInteractiveCalculator();
