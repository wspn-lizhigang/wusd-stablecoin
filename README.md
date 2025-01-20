# WUSD Stablecoin Program

This is a Solana program implementing a stablecoin (WUSD) using the Anchor framework. The program provides functionality for:

1. Initializing the WUSD mint
2. Depositing collateral to mint WUSD
3. Swapping between tokens and WUSD

## Features

- **Initialize**: Creates the WUSD mint with 6 decimals
- **Deposit**: Allows users to deposit collateral tokens and receive WUSD
- **Swap**: Enables users to swap between tokens and WUSD

## Getting Started

1. Build the program:
```bash
anchor build
```

2. Deploy the program:
```bash
anchor deploy
```

pubkey: 28jEaTYe2yDD1vpMxX2XnAnqsk1Rm4YN8N8BC6bi3kgM

3. Update the program ID in lib.rs with the deployed program ID.

## Usage

The program exposes three main instructions:

1. Initialize: Creates the WUSD mint
2. Deposit: Deposit collateral and receive WUSD
3. Swap: Swap between tokens and WUSD

Each instruction requires specific accounts to be provided as defined in the program's account structures.