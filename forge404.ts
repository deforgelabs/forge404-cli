#!/usr/bin/env node
import chalk from "chalk";
import { program } from "commander";
import fs from "fs";
import inquirer from "inquirer";
import { MerkleTree } from "merkletreejs";
import ora from "ora";
import path from "path";
import { promisify } from "util";
import { Account, Hex, createWalletClient, formatEther, hexToBytes, http, isAddress, keccak256, publicActions } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { ABI_Forge404 } from "./abis/Forge404";
import { ABI_FORGECORE } from "./abis/ForgeCore";
import { chainMap, forgeCoreContracts, isSupportedChainId } from "./chain_config";
import { createDefaultConfig, forgeBytecode, saveConfig } from "./utils";
const download = promisify(require('download-git-repo'));




const loadConfig = () => {
  //check if config exists
  if (fs.existsSync("./config.json")) {
    let config = JSON.parse(fs.readFileSync("./config.json", "utf-8"))

    if (!config.chain_id) {
      console.log(chalk.red("\nConfig file is missing required fields (chain_id), you can use `forge404 set-chain-id` to set it"))
      process.exit(1)
    }

    if (!isSupportedChainId(config.chain_id)) {
      console.log(chalk.red("\nUnsupported chain_id in config file, you can use `forge404 set-chain-id` to set it"))
      process.exit(1)
    }

    if (!config.mnemonic && !config.private_key) {
      console.log(chalk.red("\nConfig file is missing required fields (mnemonic or private_key), you can use `forge404 set-wallet` to set it"))
      process.exit(1)
    }

    if (config.mnemonic && config.private_key) {
      console.log(chalk.red("\nConfig file can only contain one of (mnemonic or private_key)"))
      process.exit(1)
    }

    return config

  } else {
    console.log(chalk.red("\nConfig file not found"))
    process.exit(1)
  }
}


const getWallet = async (config: any) => {
  let account:Account | null = null

  if (config.mnemonic) {
    account = mnemonicToAccount(config.mnemonic)
  } else if (config.private_key) {
    const pk:Hex = config.private_key.startsWith('0x') ? config.private_key : '0x' + config.private_key
    account = privateKeyToAccount(pk)
  }
  if (!account){
    throw new Error("Invalid config, could not create account");
  }
  const chainId = config.chain_id
  if (!isSupportedChainId(chainId)) {
    throw new Error("Unsupported chain_id");
  }
  return createWalletClient({
    account,
    chain:chainMap[chainId],
    transport: http(),
  }).extend(publicActions)

}



const main = async () => {
  program
      .name("forge404")
      .description("Forge404 is a tool for creating NFT collections on the EVM blockchain.")
      .version("0.0.11")

  program
      .command("set-wallet")
      .description("Load a wallet from a mnemonic")
      .action(async () => {

        //choice if private key or mnemonic
        let walletType = await inquirer.prompt([
          {
            type: "list",
            name: "walletType",
            message: "What type of wallet do you want to load?",
            choices: ['Mnemonic', 'Private Key']
          }
        ])

        let wallet = await inquirer.prompt([
          {
            type: "input",
            name: "wallet",
            message: "Enter your " + walletType.walletType + ":"
          }
        ])

        const subConfig = walletType.walletType === "Mnemonic" ? {mnemonic: wallet.wallet} : {private_key: wallet.wallet}
        saveConfig(subConfig)
      })

  // program
  //     .command("set-rpc")
  //     .description("Load a custom RPC endpoint")
  //     .action(async () => {
  //       let rpc = await inquirer.prompt([
  //         {
  //           type: "input",
  //           name: "rpc",
  //           message: "What is the RPC you want to use"
  //         }
  //       ])
  //
  //       const subConfig = {rpc: rpc.rpc}
  //       saveConfig(subConfig)
  //     })

  program
      .command("set-chain-id")
      .description("Select available chain id to use")
      .action(async () => {
        let network = await inquirer.prompt([
          {
            type: "list",
            name: "network",
            message: "What is the network you want to use?",
            choices: Object.values(chainMap).map((chain) => `${chain.name}(${chain.id})`)
          }
        ])
        const subConfig = {chain_id: +network.network.split("(")[1].split(")")[0]}
        saveConfig(subConfig)
      })

  program
      .command("init")
      .description("Initialize a new project configuration")
      .action(() => {
        let isConfig = fs.existsSync("./config.json")

        if (isConfig) {
          inquirer.prompt([
            {
              type: "confirm",
              name: "overwrite",
              message: "A config.json file already exists. Do you want to overwrite it?",
              default: false
            }
          ]).then((answers) => {
            if (answers.overwrite) {
              console.log("Overwriting config.json")
              createDefaultConfig()
            } else {
              console.log("Exiting")
            }
          })
        } else {
          createDefaultConfig()
        }
      })

  program
      .command("generate-merkle-root")
      .description("Generate Merkle root from wallet addresses")
      .argument("<file>", "Path to JSON file containing wallet addresses")
      .action((file) => {
        // Read wallet addresses
        let wallets = JSON.parse(fs.readFileSync(file, "utf-8"))

        // Hash wallet addresses
        let hashedWallets = wallets.map(keccak256)

        // Generate Merkle tree
        const tree = new MerkleTree(hashedWallets, keccak256, { sortPairs: true })
        const merkleRoot = tree.getRoot().toString('hex')

        console.log(`Merkle root: 0x${merkleRoot}`)
      });

  program
      .command("generate-merkle-proof")
      .description("Generate Merkle proof from wallet address")
      .argument("<file>", "Path to JSON file containing wallet addresses")
      .argument("<wallet>", "Wallet address to generate proof for")
      .action((file, wallet) => {
        // Read wallet addresses
        let wallets = JSON.parse(fs.readFileSync(file, "utf-8"))

        // check if wallet exists
        if (wallets.indexOf(wallet) === -1) {
          console.log(chalk.red("Wallet not found"))
          return
        }

        // Hash wallet addresses
        let hashedWallets = wallets.map(hexToBytes).map(keccak256)

        // Generate Merkle tree
        const tree = new MerkleTree(hashedWallets, keccak256, { sortPairs: true })
        const merkleRoot = tree.getRoot().toString('hex')

        // Generate Merkle proof
        const proof = tree.getProof(keccak256(hexToBytes(wallet)))

        console.log("verification: " + tree.verify(proof, keccak256(hexToBytes(wallet)), merkleRoot))

        console.log(`Merkle root: 0x${merkleRoot}`)
        console.log('Merkle leaf: ' + keccak256(hexToBytes(wallet)))
        console.log(`Merkle proof:`)
        console.log(proof.map(x => '0x'+ x.data.toString('hex')))
      });


  program
      .command("mint")
      .description("Mint new NFTs from an existing NFT collection")
      .argument("<collection>")
      .argument("<group_name>", "Mint from a specific group")

      .option("--gas-price <gas_price>", "Gas price to use for transaction (default: 0.1)")
      .action(async (collection, groupName, answers) => {

        if (groupName) {
          console.log("Minting from group: " + groupName)
        } else {
          console.log(chalk.red("You must specify a group to mint from"))
          return
        }

        if(!isAddress(collection)) {
          console.log(chalk.red("Invalid collection address"))
          return
        }


        const config = loadConfig()
        const chainId = config.chain_id

        if (!isSupportedChainId(chainId)) {
          console.log(chalk.red("Unsupported chain id"))
          return
        }

        const wallet = await getWallet(config)

        const forgeCoreAddress = forgeCoreContracts[chainId]

        const [startTime, endTime, tokenPrice,maxTokens, merkleRoot] = await wallet.readContract({
          address: forgeCoreAddress,
          abi: ABI_FORGECORE,
          functionName: "groups",
          args: [collection, groupName]
        })


        if (Number(maxTokens) === 0) {
          console.log(chalk.red("Group not found"))
          return
        }

        let num = await inquirer.prompt([
          {
            type: "input",
            name: "num",
            message: "Enter num you want to mint (default:1)",
            default: 1
          }
        ])

        const amount = +num.num

        let merkleProof: string[] = []
        if (BigInt(merkleRoot) !== 0n) {
          //ask for proof
          const proof = await inquirer.prompt([
            {
              type: "input",
              name: "proof",
              message: "Enter Merkle proof for group " + groupName + `, wallet:${wallet.account.address} separated by commas`,
              default: ""
            }
          ])
          merkleProof = proof.proof.split(",")
        }



        const cost = tokenPrice * BigInt(amount)
        //confirm cost
        const confirm = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: `Mint ${amount} NFTs for ${formatEther(cost)} tokens?`
          }])

        if (!confirm.confirm) {
          console.log(chalk.red("Minting cancelled"))
          return
        }
        let spinner = ora("Minting NFT").start()
        try {
          const hash = await wallet.writeContract({
            abi: ABI_FORGECORE,
            address: forgeCoreAddress,
            functionName: "forge404",
            args: [collection, groupName, amount, merkleProof as Hex[]],
            value: cost
          })
          spinner.info("Transaction hash: " + chalk.green(hash))
          const receipt = await wallet.waitForTransactionReceipt({hash})
          spinner.succeed("NFT minted")
        } catch (e:any) {
          spinner.fail("Minting failed: " + e.message)
        }
      })

  // program
  //     .command("view")
  //     .description("View information about an existing NFT collection")
  //     .argument("<collection_address>")
  //     .action(async (collection) => {
  //       let spinner = ora("Fetching collection information").start()
  //
  //       let config = loadConfig()
  //
  //       const chainId = config.chain_id
  //       if (!isSupportedChainId(chainId)) {
  //         console.log(chalk.red("Unsupported chain id"))
  //         return
  //       }
  //
  //       // view nft collection info
  //     })


  program
      .command("deploy")
      .description("Deploy a new NFT collection to the EVM blockchain")
      .option("--gas-price <gas_price>", "Gas price to use for transaction")
      .action(async (answers) => {

        //load config
        let config = loadConfig()

        const chainId = config.chain_id
        if (!isSupportedChainId(chainId)) {
          console.log(chalk.red("Unsupported chain id"))
          return
        }

        const wallet = await getWallet(config)

        const account = await wallet.account.address

        const args = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Enter the name of the collection:",
          },
          {
            type: "input",
            name: "symbol",
            message: "Enter the symbol of the collection:",
          },
          {
            type: "input",
            name: "decimals",
            message: "Enter the number of decimals(default: 18):",
            default: 18
          },
          {
            type: "input",
            name: "supply",
            message: "Enter the total supply of the collection:",
          },
          {
            type: "input",
            name: "ratio",
            message: "Enter the ratio of the collection:",
          },
          {
            type: "input",
            name: "initial_owner",
            message: `Enter the initial owner of the collection(default:${wallet.account.address}):`,
            default: wallet.account.address
          },
          {
            type: "input",
            name:'initial_mint_recipient',
            message: `Enter the initial mint recipient of the collection:(default:${wallet.account.address}):`,
            default: wallet.account.address
          },
          {
            type: "confirm",
            name: "pause_transfer",
            message: "Do you want to pause transfer?",
          }
        ])

        if (!args.name || !args.symbol || !args.supply || !args.ratio) {
          console.log(chalk.red("Invalid input"))
          return
        }

        if (+args.decimals < 18) {
          console.log(chalk.red("Invalid decimals, must be greater than 18"))
          return
        }

        if (+args.ratio < 0 || isNaN(+args.ratio)) {
          console.log(chalk.red("Invalid ratio"))
          return
        }

        if (+args.supply < 0 || isNaN(+args.supply)) {
          console.log(chalk.red("Invalid supply"))
          return
        }

        if (!isAddress(args.initial_owner)) {
          console.log(chalk.red("Invalid initial owner address"))
          return
        }

        if (!isAddress(args.initial_mint_recipient)) {
          console.log(chalk.red("Invalid initial mint recipient address"))
          return
        }


        let spinner = ora("Deploying Collection Contract").start()

        const hash = await wallet.deployContract({
          abi: ABI_Forge404,
          bytecode: forgeBytecode,
          args: [args.name, args.symbol, args.decimals, args.supply, args.ratio, args.initial_owner, args.initial_mint_recipient, args.pause_transfer]
        })

        const receipt = await wallet.waitForTransactionReceipt({hash})

        const deployedAddress = receipt.contractAddress

        if (!deployedAddress) {
          spinner.fail("Failed to deploy contract")
          return
        }

        spinner.succeed("Forge404 Contract deployed to EVM blockchain.Contract address: " + deployedAddress)

      })


  program.command('registry')
      .description('View the registry of all NFT collections')
      .argument('<collection>', 'The address of the collection')
      .action(async (collection:string) => {

        if (!isAddress(collection)) {
          console.log(chalk.red("Invalid collection address"))
          return
        }

        const config = loadConfig()
        const wallet = await getWallet(config)
        const chainId = config.chain_id

        if (!isSupportedChainId(chainId)) {
          console.log(chalk.red("Unsupported chain id"))
          return
        }

        // let token_uri = config.token_uri || ''
        // if (token_uri[token_uri.length - 1] === "/")
        //   token_uri = token_uri.slice(0, -1)

        let args = await inquirer.prompt([
          {
            type: "input",
            name: "mint_recipient",
            message: `Please input the address you want to receive the minted NFTs(default:${wallet.account.address}):`,
            default:wallet.account.address
          },
          {
            type: "input",
            name: "collection_creator",
            message: `Please input the address of the collection creator(default:${wallet.account.address})?`,
            default: wallet.account.address
          }, {
            type: "input",
            name: "sale_count",
            message: "How many NFTs do you want to sale(default:1)?",
            default: 1
          }
        ])

        if (!isAddress(args.mint_recipient)) {
          console.log(chalk.red("Invalid mint recipient address"))
          return
        }

        if (!isAddress(args.collection_creator)) {
          console.log(chalk.red("Invalid collection creator address"))
          return
        }

        if (isNaN(args.sale_count) || +args.sale_count < 1) {
          console.log(chalk.red("Invalid sale count"))
          return
        }

        let spinner = null
        try {
          const fee = await wallet.readContract({
            abi: ABI_FORGECORE,
            address: forgeCoreContracts[chainId],
            functionName: 'registryFee',
          })

          const chain = chainMap[chainId]

          const confirm = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: `The registration fee is ${formatEther(fee)} ${chain.nativeCurrency.symbol}, do you want to continue?`
            }])

           spinner = ora("Registering Collection").start()

          if (!confirm.confirm) {
            spinner.fail("Registration cancelled")
            return
          }

          const hash = await wallet.writeContract({
            abi:ABI_FORGECORE,
            address: forgeCoreContracts[chainId],
            functionName: 'registry404',
            args: [collection, args.collection_creator, args.mint_recipient, args.sale_count],
            value:fee
          })

          const registerReceipt = await wallet.waitForTransactionReceipt({hash})
          spinner.succeed("Collection registered to ForgeCore")
          console.log("Transaction hash: " + chalk.green(registerReceipt.transactionHash))

          /**
           *  function approve(
           *     address spender_,
           *     uint256 valueOrId_
           *   ) public virtual returns (bool)
           */
          spinner = ora("approve sale amount to forgeCore").start()

          const unit = await wallet.readContract({
            abi: ABI_Forge404,
            address: collection,
            functionName: 'getUnits',
          })
          const approveValue = unit * BigInt(args.sale_count)
          const approveHash = await wallet.writeContract({
            abi: ABI_Forge404,
            address: collection,
            functionName: 'approve',
            args: [forgeCoreContracts[chainId], approveValue]
          })

          const approveReceipt = await wallet.waitForTransactionReceipt({hash:approveHash})
          spinner.succeed("Approved sale amount to forgeCore")
        } catch (e) {
          spinner?.fail("Failed to register collection")
          console.log(e)
        }

      })


  program
      .command("unpause")
      .description("Unpause a collection")
      .argument("<collection>")
      .option("--gas-price <gas_price>", "Gas price to use for transaction")
      .action(async (collection, options) => {

        if (!isAddress(collection)) {
          console.log(chalk.red("Invalid collection address"))
          return
        }

        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Unfreezing collection").start()

        const hash = await wallet.writeContract({
          abi: ABI_Forge404,
          address: collection,
          functionName: 'unpause',
          gasPrice: options.gasPrice
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})
        spinner.succeed("Collection unpause!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))

      })

  program.command('set-metadata')
      .description('set image and metadata for a collection')
      .argument('<collection>', 'collection address')
      .argument('<image_uri>', 'image url')
      .argument('<external_url>', 'external url')
      .argument('<desc>', 'description')
      .action(async (collection, image_uri, external_url, desc) => {
        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Setting metadata").start()

        const hash = await wallet.writeContract({
          abi: ABI_Forge404,
          address: collection,
          functionName: 'setMetadata',
          args: [desc, image_uri, external_url]
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})
        spinner.succeed("Metadata set!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))
      })

  program.command('set-metadata-image')
      .argument('<collection>', 'collection address')
      .argument('<image_names>', 'image names split by commas')
      .argument('<property_key>', 'property key for image')
      .argument('<property_values>', 'property value for images, split by commas')
      .argument('<weights>', 'property weights for images, split by commas')
      .action(async (collection, image_names, property_key, property_values, weights) => {
        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Setting metadata").start()

        const hash = await wallet.writeContract({
          abi: ABI_Forge404,
          address: collection,
          functionName: 'setMetadataImage',
          args: [weights.split(',').map(Number), image_names.split(','), property_key, property_values.split(',')]
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})
        spinner.succeed("Metadata image set!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))
      })
  /**
   *     function addMetadataProperty(
   *         string calldata propertykey_,
   *         string[] calldata values_,
   *         uint8[] calldata weights_
   *     ) public onlyOwner {
   *         propertyKeys.push(propertykey_);
   *         for (uint i = 0; i < values_.length; i++) {
   *             properties[propertykey_].propertyValues.push(values_[i]);
   *         }
   *
   *         for (uint i = 0; i < weights_.length; i++) {
   *             properties[propertykey_].weights.push(weights_[i]);
   *         }
   *     }
   */
  program.command('add-metadata-property')
      .argument('<collection>', 'collection address')
      .argument('<property_key>', 'property key')
      .argument('<property_values>', 'property values, split by commas')
      .argument('<weights>', 'property weights, split by commas')
      .action(async (collection, property_key, property_values, weights) => {
        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Setting metadata").start()

        const hash = await wallet.writeContract({
          abi: ABI_Forge404,
          address: collection,
          functionName: 'addMetadataProperty',
          args: [property_key, property_values.split(','), weights.split(',').map(Number)]
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})
        spinner.succeed("Metadata property added!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))
      })
  /**
   *
   *     struct Group {
   *         uint256 startTime;
   *         uint256 endTime;
   *         uint256 tokenPrice;
   *         uint256 maxTokens;
   *         bytes32 merkleRoot;
   *     }
   *
   *     function addGroup(
   *         address collection,
   *         string memory groupName,
   *         Group memory group
   *     ) public {
   *         _checkCreator(collection);
   *         groups[collection][groupName] = group;
   *
   *         emit AddGrounp(
   *             collection,
   *             groupName,
   *             group.startTime,
   *             group.endTime,
   *             group.tokenPrice,
   *             group.maxTokens,
   *             group.merkleRoot
   *         );
   *     }
   */
  program.command('add-group')
      .argument('<collection>', 'collection address')
      .argument('<group_name>', 'group name')
      .argument('<start_time>', 'start time')
      .argument('<end_time>', 'end time')
      .argument('<token_price>', 'token price')
      .argument('<max_tokens>', 'max tokens')
      .argument('<merkle_root>', 'merkle root')
      .action(async (collection, group_name, start_time, end_time, token_price, max_tokens, merkle_root) => {
        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Adding group").start()

        const chainId = config.chain_id

        if (!isSupportedChainId(chainId)) {
          spinner.fail(`Chain ID ${chainId} is not supported.`)
          process.exit(1)
        }

        const forgeCoreAddress = forgeCoreContracts[chainId]

        const hash = await wallet.writeContract({
          abi: ABI_FORGECORE,
          address: forgeCoreAddress,
          functionName: 'addGroup',
          args: [collection, group_name, {
            startTime: start_time,
            endTime: end_time,
            tokenPrice: token_price,
            maxTokens: max_tokens,
            merkleRoot: merkle_root
          }]
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})

        const groups = config.groups || []

        groups.push({
          name: group_name,
          start_time,
          end_time,
          unit_price: token_price,
          max_tokens,
          merkle_root,
          creator:wallet.account.address
        })

        saveConfig({groups})

        spinner.succeed("Group added!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))
      })
  /**
   *     function changeGroup(
   *         address collection,
   *         string memory groupName,
   *         Group memory group
   *     ) public {
   *         _checkCreator(collection);
   *         groups[collection][groupName] = group;
   *
   *         emit ChangeGrounp(
   *             collection,
   *             groupName,
   *             group.startTime,
   *             group.endTime,
   *             group.tokenPrice,
   *             group.maxTokens,
   *             group.merkleRoot
   *         );
   *     }
   */
  program.command('change-group')
      .argument('<collection>', 'collection address')
      .argument('<group_name>', 'group name')
      .argument('<start_time>', 'start time')
      .argument('<end_time>', 'end time')
      .argument('<token_price>', 'token price')
      .argument('<max_tokens>', 'max tokens')
      .argument('<merkle_root>', 'merkle root')
      .action(async (collection, group_name, start_time, end_time, token_price, max_tokens, merkle_root) => {
        let config = loadConfig()
        const wallet = await getWallet(config)
        let spinner = ora("Changing group").start()

        const chainId = config.chain_id

        if (!isSupportedChainId(chainId)) {
          spinner.fail(`Chain ID ${chainId} is not supported.`)
          process.exit(1)
        }

        const forgeCoreAddress = forgeCoreContracts[chainId]

        const hash = await wallet.writeContract({
          abi: ABI_FORGECORE,
          address: forgeCoreAddress,
          functionName: 'changeGroup',
          args: [collection, group_name, {
            startTime: start_time,
            endTime: end_time,
            tokenPrice: token_price,
            maxTokens: max_tokens,
            merkleRoot: merkle_root
          }]
        })

        const txReceipt = await wallet.waitForTransactionReceipt({hash})

        const groups = config.groups || []
        const target = groups.find((g:any) => g.name === group_name)
        if (target) {
          target.start_time = start_time
          target.end_time = end_time
          target.unit_price = token_price
          target.max_tokens = max_tokens
          target.merkle_root = merkle_root
          target.creator = wallet.account.address
        } else {
          groups.push(
            {
              name: group_name,
              start_time,
              end_time,
              unit_price: token_price,
              max_tokens,
              merkle_root,
              creator:wallet.account.address
            }
          )
        }

        saveConfig({groups})

        spinner.succeed("Group changed!")
        console.log("Transaction hash: " + chalk.green(txReceipt.transactionHash))
      })
  program.command('create-app')
      .argument('[dir]', 'the path project to clone', './')
      .action(async (dir) => {
    const args = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'App name:',
        default: 'My Forge404 App',
        validate(input: any): boolean | string | Promise<boolean | string> {
          if (input.length === 0) {
            console.log(chalk.red('App name is required'))
            return false
          }
          return true
        }
      }, {
        type: 'input',
        name: 'description',
        message: 'App description:',
      }, {
        type: 'input',
        name: 'website',
        message: 'Please input the website you will deploy the app:',
      }, {
        type: 'input',
        name: 'twitter',
        message: 'Please input the twitter you want to display in the app:',
      }, {
        type: 'input',
        name: 'telegram',
        message: 'Please input the telegram you want to display in the app:',
      }, {
        type: 'input',
        name: 'discord',
        message: 'Please input the discord you want to display in the app:',
      },
      {
        type: "list",
        name: "network",
        message: "What is the evm network you want to setup in app?",
        choices: Object.values(chainMap).map((chain) => `${chain.name}(${chain.id})`)
      },
      {
        type: 'input',
        name: 'collection_address',
        message: 'Please input the forge404 contract address you have deployed(you can use `forge404 deploy` to deploy):',
      }
    ])
    const chainId = +args.network.split("(")[1].split(")")[0]
    const config = {
      name: args.name,
      description: args.description,
      website: args.website,
      twitter: args.twitter,
      telegram: args.telegram,
      discord: args.discord,
      chain_id: chainId,
      collection_address: args.collection_address,
      groups: [{
        name: 'public',
        allowlist: [],
      }]
    }
    const spinner = ora("Creating app").start()
    try {
      await download('forgecore/forge404-ui',dir, {})
      fs.writeFileSync(path.resolve(dir, "./src/config.json"), JSON.stringify(config, null, 4))
      spinner.succeed("App created!, use `npm install` to continue")
      //execute npm install
      // const npmInstall = spawn('npm', ['install'], {cwd: dir})
    } catch (e) {
      spinner.fail("Failed to create app")
      console.error(e)
      process.exit(1)
    }

  })
  program.parse()

}

main()
