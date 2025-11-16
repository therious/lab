# Lottery Number Predictor

A React + Vite application that predicts lottery number combinations based on historical data analysis for Powerball, Mega Millions, and Lotto games.

## Features

- **Historical Data Analysis**: Analyzes past winning numbers to identify patterns
- **Smart Prediction**: Generates combinations that haven't been drawn before with balanced frequency patterns
- **Worker Thread Support**: Offloads computation to web workers for better performance
- **Multiple Games**: Supports Powerball, Mega Millions, and standard Lotto games

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Building

```bash
npm run build
```

## Historical Data

The application uses TypeScript data files located in `src/data/`:

- `powerball.ts` - Powerball historical draws (1,862 draws from 2010-2024)
- `megamillions.ts` - Mega Millions historical draws (2,450 draws from 2002-2024)
- `lotto.ts` - NY Lotto historical draws (2,522 draws from 2001-2024)

The data files contain complete historical winning numbers. To add new draws, edit the files directly in `src/data/`.

## How It Works

The prediction algorithm:

1. **Analyzes Historical Patterns**: Calculates frequency of individual numbers and number pairs
2. **Filters Out Previous Draws**: Only considers combinations that haven't been drawn before
3. **Scores Combinations**: Evaluates candidates based on:
   - Number frequency (prefers moderate frequency, not too hot/cold)
   - Pair frequency (common pairs are slightly favored)
   - Number spread (balanced distribution)
   - Odd/even balance
   - Sum distribution
4. **Selects Best Candidate**: Chooses the combination with the highest confidence score

## Disclaimer

This tool analyzes historical patterns but does not guarantee winning. Lottery numbers are drawn randomly, and each combination has equal probability. This application is for entertainment purposes only.

## License

MIT
