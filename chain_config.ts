import {mainnet, goerli, bsc, bscTestnet, Chain} from 'viem/chains'
import {Address} from 'viem'

export enum ChainId {
  MAINNET = 1,
  GOERLI = 5,
  BSC = 56,
  BSC_TESTNET = 97
}

export const chainMap:{
  [key in ChainId]:Chain
} =  {
  [ChainId.MAINNET]: mainnet,
  [ChainId.GOERLI]: goerli,
  [ChainId.BSC]: bsc,
  [ChainId.BSC_TESTNET]: bscTestnet
}

export const forgeCoreContracts: {
  [key in ChainId]: Address
} = {
  [ChainId.MAINNET]: '0x3f2345412a96847c551479AA1FA62B797b441A8d',
  [ChainId.GOERLI]: '0x3f2345412a96847c551479AA1FA62B797b441A8d',
  [ChainId.BSC]: '0x3f2345412a96847c551479AA1FA62B797b441A8d',
  [ChainId.BSC_TESTNET]: '0x3f2345412a96847c551479AA1FA62B797b441A8d'
}

export const deployFeeReceiver: {
    [key in ChainId]: Address
    } = {
    [ChainId.MAINNET]: '0x290073d7e3a1454cc837903DC78b8125EBC4232a',
    [ChainId.GOERLI]: '0x290073d7e3a1454cc837903DC78b8125EBC4232a',
    [ChainId.BSC]: '0x290073d7e3a1454cc837903DC78b8125EBC4232a',
    [ChainId.BSC_TESTNET]: '0x290073d7e3a1454cc837903DC78b8125EBC4232a'

}
export function isSupportedChainId(chainId: number): chainId is ChainId {
  return Object.values(ChainId).includes(chainId)
}