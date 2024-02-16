
# Lighthouse

Forge404 is a powerful command line interface tool designed to facilitate the interaction with Non-Fungible Tokens (NFTs) on the EVM blockchain. It allows users to easily update and deploy NFT collections.

## Features

- Deploy NFT collections
- Update NFT collections
- Register trading of NFT collections
- Reveal metadata of NFT collections
- Mint NFTs
- Generate merkle root for allowlists
- Generate merkle proof for a wallet


## Installion

From your command line:
```bash
# Install lighthouse globally
$ npm install -g forge404

# Run the app
$ forge404
```


## Usage


### `init`

Init a new project configuration. It will ask you several questions about your project (name, symbol, total supply, etc.) and generate a configuration file (`config.json`) based on your answers.
```sh
$ forge404 init
```
### `set wallet`

Load a wallet with mnemonic keyphrase or private key to use in cli.

```sh
$ forge404 set-wallet
```

### `set chain id`

Select network to use in cli.

```sh
$ forge404 set-chain-id
```
### `deploy`

Deploy a new NFT collection based on (`config.json`) . 
```
$ forge404 deploy
```