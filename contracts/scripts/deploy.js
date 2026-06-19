const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const TokenizedEquity = await hre.ethers.getContractFactory("TokenizedEquity");
  const token = await TokenizedEquity.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("TokenizedEquity deployed to:", address);

  console.log("\n--- Deployment Summary ---");
  console.log("Network:", hre.network.name);
  console.log("Contract:", address);
  console.log("Deployer:", deployer.address);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await token.deploymentTransaction().wait(5);

    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("Contract verified!");
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
