import execa from "execa"
import chalk from "chalk"
import invariant from "tiny-invariant"
import inquirer from "inquirer"
import AWS from "aws-sdk"

const CF = new AWS.CloudFront({ apiVersion: "2020-05-31" })

const CLOUDFRONT_ID = "E9UOY3VP89NXH"
const BUCKET_NAME = "www.ivantanev.com"
const BUCKET = `s3://${BUCKET_NAME}`

main().catch((e) => {
  console.log(chalk.red("Error executing deploy:"))
  console.error(e)
})

async function main() {
  await prerequsites()
  await confirmDeploy()
  await build()
  await syncS3bucket()

  // hack around main index cached in browser
  // await setNoCache(`${BUCKET}/index.html`)

  await updateCloudfront()
  console.log(chalk.green("Successful deploy!"))
}

async function prerequsites() {
  if (!process.env.AWS_PROFILE) {
    throw new Error(
      chalk`{red You must set the} {red.bold AWS_PROFILE} {red environment variable!}`
    )
  }

  await prerequisiteAWS()
  await ensureS3Access()

  /////////////////////////////////

  async function prerequisiteAWS() {
    const AWS_ALLOWED_VERSION = /^aws-cli\/1/

    await util_commandExists("aws")

    const awsVersion = await execa("aws", ["--version"], {
      extendEnv: false,
      env: {},
    })
    invariant(
      AWS_ALLOWED_VERSION.test(awsVersion.stdout),
      chalk.red(
        `The deploy script requires aws-cli 1.x. You have an incompatible version installed: ${awsVersion.stdout}`
      )
    )
  }

  async function ensureS3Access() {
    console.log("Checking for AWS access...")
    if (await util_canAccessAWSBucket()) {
      console.log(chalk.green(`We have AWS access.`))
    } else {
      console.log(chalk.red(`No AWS access.`))
      throw new Error("No AWS acccess")
    }
  }
}

async function confirmDeploy() {
  await inquirer.prompt([
    {
      name: "confirm",
      type: "confirm",
      default: true,
      message: [
        chalk`{yellow You are about to deploy to} {blue.bold www.ivantanev.com}{yellow .}`,
        chalk`{yellow Press} {yellow.bold [enter]} {yellow to continue or} {yellow.bold [ctrl-c]} {yellow to cancel}`,
      ].join("\n"),
    },
  ])
}

async function build() {
  console.log("Starting build...")
  const subprocess = execa("npm", ["run", "build"])
  subprocess.stdout?.pipe(process.stdout)
  subprocess.stderr?.pipe(process.stderr)

  await subprocess
  console.log(chalk.green("Build complete."))
}

async function syncS3bucket() {
  console.log("Starting S3 sync...")

  // sync
  let subprocess = execa("aws", ["s3", "sync", `public/`, BUCKET])
  subprocess.stdout?.pipe(process.stdout)
  subprocess.stderr?.pipe(process.stderr)

  await subprocess
  console.log(chalk.green("Sync complete."))
}

// async function setNoCache(path: string) {
//   console.log(`Setting no-cache headers for: ${path}`)
//   await execa("aws", [
//     "s3",
//     "cp",
//     path,
//     path,
//     `--metadata-directive`,
//     `REPLACE`,
//     `--cache-control`,
//     `private, no-cache, no-store, must-revalidate`,
//   ])
// }

async function updateCloudfront() {
  console.log("Triggering CloudFront cache invalidation.")
  await invalidateDistributionPaths(CLOUDFRONT_ID, ["/*"])

  //////////////////////////

  async function invalidateDistributionPaths(
    DistributionId: string,
    paths: string[]
  ) {
    const invalidation: AWS.CloudFront.Types.CreateInvalidationRequest = {
      DistributionId,
      InvalidationBatch: {
        CallerReference: new Date().toISOString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }

    return CF.createInvalidation(invalidation).promise()
  }
}

///////////////////////////////////////////////////////

async function util_canAccessAWSBucket(): Promise<boolean> {
  try {
    await execa("aws", ["s3", "ls", `${BUCKET}`])
    return true
  } catch (e) {
    return false
  }
}

async function util_commandExists(command: string): Promise<void> {
  try {
    await execa("command", ["-v", command], { shell: true })
  } catch (e) {
    throw new Error(`Command "${command}" is not available`)
  }
}
