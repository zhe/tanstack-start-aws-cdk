#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RootStack } from "../lib/root-stack";

const app = new cdk.App();

// Define allowed stages
const ALLOWED_STAGES = ["dev", "staging", "prod"] as const;

// Get stage from context or default to 'dev'
const stage = app.node.tryGetContext("stage") || "dev";

if (!ALLOWED_STAGES.includes(stage)) {
  throw new Error(
    `Invalid stage: ${stage}. Allowed stages: ${ALLOWED_STAGES.join(", ")}`
  );
}

// Capitalize first letter of stage
const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1);

new RootStack(app, `${stageCapitalized}TanStackStartRootStack`, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  stage,
});
