import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";

export interface RootStackProps extends cdk.StackProps {
  stage: "dev" | "staging" | "demo" | "prod";
}

export class RootStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RootStackProps) {
    super(scope, id, props);
    const stage = props.stage;
    const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1);
    const isDev = props.stage === "dev";

    // Create S3 bucket for static assets
    const staticAssetsBucket = new s3.Bucket(this, "StaticAssetsBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create Lambda function for server code
    const serverFunction = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../app/.output/server"),
        {
          followSymlinks: cdk.SymlinkFollowMode.ALWAYS,
        }
      ),
      memorySize: isDev ? 1024 : 2048,
      timeout: cdk.Duration.seconds(isDev ? 30 : 60),
      environment: {
        // Add any environment variables needed by your app
        NODE_ENV: isDev ? "development" : "production",
        STAGE: stage,
      },
    });

    // Create Lambda function URL
    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${stageCapitalized}TanStackStartCDK`,
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(serverFunctionUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        "/_build/*": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/assets/*": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/*.ico": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/*.png": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/site.webmanifest": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../app/.output/public")),
      ],
      destinationBucket: staticAssetsBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Output the CloudFront distribution URL and Lambda function URL
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "URL of the CloudFront distribution",
    });
    new cdk.CfnOutput(this, "LambdaFunctionUrl", {
      value: serverFunctionUrl.url,
      description: "URL of the Lambda function",
    });
  }
}
