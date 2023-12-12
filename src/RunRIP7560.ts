import { ethers } from 'hardhat'
import {
  RIP7560Account__factory,
  RIP7560Deployer__factory,
  RIP7560NonceManager__factory,
  RIP7560Paymaster__factory
} from '../typechain'
import { question } from 'readline-sync'

async function main (): Promise<void> {
  const [coinbase] = await ethers.provider.listAccounts()
  console.log('Coinbase Account: ', coinbase)

  const signer = ethers.provider.getSigner(coinbase)

  const nonceManager = await new RIP7560NonceManager__factory(signer).deploy('0x7560000000000000000000000000000000007560')

  // const account = await new RIP7560Account__factory(signer).deploy()
  const revertValidation = (parseInt(process.env.REVERT!) !== 0) ?? false
  const paymaster = await new RIP7560Paymaster__factory(signer).deploy(revertValidation)
  const deployer = await new RIP7560Deployer__factory(signer).deploy()

  const accountAddress = await deployer.getAddress(deployer.address, 0)

  console.log('Smart Account: ', accountAddress)
  console.log('Paymaster: ', paymaster.address, ' reverts: ', revertValidation)
  console.log('Deployer: ', deployer.address)
  console.log('Nonce Manager: ', nonceManager.address, ' reverts: ', revertValidation)

  const paymasterData = paymaster.address +
    nonceManager.address.replace('0x', '') +
    ethers.utils
      .hexlify(ethers.utils.toUtf8Bytes('hello paymasters!'))
      .replace('0x', '')

  const deployerData = deployer.address +
    deployer.interface
      .encodeFunctionData('createAccount', [deployer.address, 0])
      .replace('0x', '')

  console.log('Paymaster Data: ', paymasterData)
  console.log('Deployer Data: ', deployerData)

  const data = RIP7560Account__factory.createInterface().encodeFunctionData('anyExecutionFunction')

  const response = await signer.sendTransaction({
    to: accountAddress,
    value: 10e18.toString()
  })
  console.log('Value transfer tx hash: ', response.hash)

  question('Press enter to send AA transaction:>')

  const type4transaction1 = {
    gas: '0xf4240',
    value: '0x1',
    // todo: remove 'from' field for Type 4 request
    from: coinbase,
    to: '0xf45b5e4058bfa43ae80744f206eb3aacf6cda867',
    maxFeePerGas: '0x342770c0',
    maxPriorityFeePerGas: '0x342770c0',
    builderFee: '0xdeadbeef',
    nonce: '0x7',
    // RIP-7560 transaction fields
    sender: accountAddress,
    bigNonce: '0x8',
    signature: '0xbb',
    validationGas: '0xf4240',
    paymasterGas: '0xf4240',
    deployerData,
    data,
    paymasterData
  }
  // const type4transaction2 = {
  //   ...type4transaction1,
  //   to: '0xaa5b5e4058bfa43ae80744f206eb3aacf6cda867',
  //   nonce: '0x8'
  // }
  const responseAA1 = await ethers.provider.send('eth_sendTransaction', [type4transaction1])
  // const responseAA2 = await ethers.provider.send('eth_sendTransaction', [type4transaction2])

  console.log('=========')
  console.log('AA transactions sent. Responses:')
  console.warn(JSON.stringify(responseAA1))

  const receipt = await ethers.provider.getTransactionReceipt(responseAA1)

  console.log('Receipt:', JSON.stringify(receipt))

  console.log('Logs count:', receipt.logs.length)

  // console.warn(JSON.stringify(responseAA2))
}

void main()
