const https = require('https');

const { execSync } = require('child_process');

async function getHealthCheck(branchName) {
  let url;
  if (branchName === 'master') {
    url = 'https://bakipl.shopup.com.bd/v0/hc';
  } else {
    url = 'https://bakipl.eloans1.xyz/v0/hc';
  }

  const response = await new Promise((resolve, reject) => {
    const req = https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        resolve(JSON.parse(data));
      });
      resp.on('error', (err) => reject(err));
    });

    req.on('error', (e) => reject(e));

    req.end();
  });

  return response;
}

function getCurrentBranch() {
  const hashCommand = 'git rev-parse HEAD';
  const commitHash = execSync(hashCommand).toString().trim();

  const branchNameCommand = 'git rev-parse --abbrev-ref HEAD';
  const branchName = execSync(branchNameCommand).toString().trim();

  return {
    branchName,
    commitHash,
  };
}

function _exit(message) {
  console.error(message);
  process.exit(1);
}

function getDeployedHashDetails(hash) {
  const command = `git log --pretty=oneline | grep ${hash}`;
  const hashInfo = execSync(command).toString().trim();
  return hashInfo;
}

async function run() {
  const { branchName, commitHash } = getCurrentBranch();

  if (!['master', 'staging'].includes(branchName)) {
    _exit('!!! can only check for master and staging');
  }

  const healthCheck = await getHealthCheck(branchName);
  const deployedHash = healthCheck.commitHash;

  const deployedHashMessage = getDeployedHashDetails(deployedHash);

  if (deployedHash === commitHash) {
    console.log(
      `Current HEAD in branch '${branchName}' is deployed in ${
        branchName === 'master' ? 'production' : 'staging'
      }!`,
    );
  } else {
    console.log(
      `Current HEAD in branch '${branchName}' is not deployed!\nDeployed commit = [${deployedHashMessage}]`,
    );
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
