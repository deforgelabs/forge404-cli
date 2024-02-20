
# Forge404

Forge404 is a powerful command line interface tool designed to facilitate the interaction with Non-Fungible Tokens (NFTs) on the EVM blockchain. It allows users to easily update and deploy NFT collections.

## Features

- Deploy forge404 NFT collections
- Update forge404 NFT collections
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

### `version`

view the forge404-cli version

```shell
forge404 -V
#0.0.15
```

### `init`

Init a new project configuration. It will ask you several questions about your project (name, symbol, total supply, etc.) and generate a configuration file (`config.json`) based on your answers.
```sh
$ forge404 init
```
### `set wallet`

Load a wallet with mnemonic keyphrase or private key to use in cli. it will be used in other command line operations(`deploy`,`mint`, `registry`, `add-group`).

```sh
$ forge404 set-wallet
```

### `set evm chain id`

Select network to use in cli.

```sh
$ forge404 set-chain-id
```

### `deploy`

Deploy a new forge404 contract with some simple questions based on (`config.json`) . 
```shell
$ forge404 deploy
# ? Enter the name of the collection: (myNFT)
# ? Enter the symbol of the collection: (NFT)
# ? Enter the number of decimals(default: 18): (18)
# ? Enter the total supply of the collection: (100)
# ? Enter the ratio of the collection: (100)
# ? Enter the initial owner of the collection: (0x100...)
# ? Enter the initial mint recipient of the collection: (0x100...)
# ? Do you want to pause transfer? (y/N) (N)
```
`total supply` is the total supply of the collection. if the total supply is 100, it means that the collection can max mint 100 NFTs

`ratio` is the ratio of the collection. if the ratio is 100, it means that the 1 NFT contains 100 erc20 tokens

`initial owner` is the owner of the collection, can manage current forge404 contract .

`initial mint recipient` is the recipient of the first minted NFT.

`pause transfer` if need to pause transfer choose y.

### `registry`

Register trading of NFT collections to forgeCore contract. 
```shell
$ forge404 registry <collection>
```
`collection` is the contract address you deployed with `forge404 deploy`.

### `unpause`

Unpause transfer of NFT collections to forgeCore contract. 
```shell
$ forge404 unpause <collection>
```
`collection` is the contract address you deployed with `forge404 deploy`.

### `add group`

Add a mint group for forge404 contract to the forgeCore contract. 
```shell
$ forge404 add-group <collection> <group_name> <start_time> <end_time> <token_price> <max_tokens> <merkle_root>
```
`collection` is the contract address you deployed with `forge404 deploy`.

`group_name` is the name of the mint group.

`start_time` is the start time of the mint group.

`end_time` is the end time of the mint group.

`token_price` is the unit price of the mint group.

`max_tokens` is the max mint tokens of the mint group.

`merkle_root` is the merkle root of the mint group, you can generate it with `forge404 generate-merkle-root`.

### `update group`

Update a mint group you added with `forge404 add-group`. 
```shell
$ forge404 change-group <collection> <group_name> <start_time> <end_time> <token_price> <max_tokens> <merkle_root>
```

### `mint NFT`

Mint NFTs in mint group with some questions, 
```shell
$ forge404 mint <collection> <group_name>
# ? Enter num you want to mint (default:1)
# ? Enter Merkle proof for group
```

`collection` is the contract address you deployed with `forge404 deploy`.

`num` is the number of NFTs you want to mint.

`Merkle proof` is the merkle proof of the mint group, you can generate it with `forge404 generate-merkle-proof`.


### `create app`

Init a new mint front project and overwrite a configuration file (`src/config.json`) based on your answers.
```sh
$ forge404 create-app [dir]
```

### `generate merkle root`

Generate merkle root for allowlists.
```sh
$ forge404 generate-merkle-root <file>
```

`file` is the file path of the allowlists json file, content just like `["0x01...", "0x02..."]`.

### `generate merkle proof`

Generate merkle proof for a wallet.
```sh
$ forge404 generate-merkle-proof <file> <wallet>
```

`file` is the file path of the allowlists json file, content just like `["0x01...", "0x02..."]`.
`wallet` is the wallet address you want to generate merkle proof.

### `creator withdraw`

withdraw the sale of the NFTs to the creator.
```sh
$ forge404 creator-withdraw <collection> <to>
```

`collection` is the contract address you deployed with `forge404 deploy`.

`to` is the address you want to withdraw to.

### `set metadata`

Set metadata for the forge404 contract.
```sh
$ set-metadata <collection> <image_uri> <external_url> <desc>
```

### add-metadata-property

Add metadata property for the forge404 contract.
```sh
$ add-metadata-property <collection> <property_key> <property_values> <weights>
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