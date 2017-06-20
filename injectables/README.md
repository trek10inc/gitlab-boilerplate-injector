# How to be `aws`ome at CI

You should replace this README with your own after you have followed the instructions below.

### Quickstart for Serverless projects

1. Setup the variables in your `.gitlab-ci.yml`
2. Add the block below to the top of your `serverless.yml`
3. Grab other resources, such as eslint config, from the links at the very end of this document
4. Write code!
5. PROFIT!!!

##### serverless.yml block
```
custom:
  emptystring: ""
  false: false

provider:
  name: aws
  runtime: nodejs6.10
  stage: dev
  variableSyntax: '\${((env|self|opt|file|cf|s3)[:\(][ :a-zA-Z0-9._,\-\/\(\)]*?)}'
#  environment: ${file(serverless-${opt:stage}.yml):environment}
```

### .gitignore

A `.gitignore` should have been added for you with Node and Serverless support.

### CI details

The `.gitlab-ci.yml` was designed for use in Serverless framework projects with a single service using Node.js.
If you are doing something different, you will need a more significant overhaul of the configuration and/or
scripts.

If the `.gitlab-ci.yml` is missing, either this repository's group hierarchy is configured to exclude the CI config
or something went wrong. If you feel this was an error, double check the injector configuration.

If you have unit tests, you need to configure them to run with `npm run test` or write a custom script in the
`run_tests` job.

### CI trigger rules

Production deploys happen when a commit that is part of `master` is tagged. Note: since tags have no sense of what
branch they belong to, you can accidentally trigger this process when you are on other branches if you tag a commit
that has been merged to `master`. Take care when tagging commits.

Staging deploys happen when commits are merged into or directly pushed to `master`.

Dev deploys occur when commits are merged into or directly pushed to non-`master` branches.

### CI variables

Configuring CI variables at the top of the `.gitlab-ci.yml` is essential to getting the expected results from
your CI.

##### SLS stuff

`SLS_VERSION` needs to match the version of Serverless framework that you are using. If you pin the version in your
`serverless.yml`, you must match that. If you delete this variable, it will fall back to `latest`.

`SLS_YAML_DIR` indicates the location of the `serverless.yml` file relateive to the repository root. So, if it is
in the repo root, the value of `SLS_YAML_DIR` should be `"."`.

##### Accounts

You will need to supply an account number for each deployment stage.

**NOTE: Because of an issue in GitLab, all numeric variables must be quoted.**
See [here](https://gitlab.com/gitlab-org/gitlab-ce/issues/30017).

##### Regions

You will need to supply a region for each stage. Production deployments have been designed with multiregion
needs in mind. Uncomment the `PROD2_REGION` variable and the  `deploy:production_2` job to enable a second
region. Make additional variables and jobs (e.g. `PROD3_REGION` and `deploy:production_3`), if you need more
than 2 regions.

##### Stage names

You will need to supply a stage name for each stage. It is worth noting that "dev" is not a stage. Instead, each
non-`master` branch can generate its own deployment with a unique name. `DEV_SLS_STAGE_NAME_BASE` is a prefix for
these stages. The rest of the stage name comes from a modified version of the `CI_COMMIT_REF_SLUG` variable:
the branch name lowercased, shortened to 63 bytes, and with everything except 0-9 and a-z removed (NOTE: the
removal occurs after the shortening).

### Working with Serverless

You'll want to replace/merge the existing `provider` section in your `serverless.yml` with the block from the
top of this file. The commented out line allows you to load a config file as environment variables.

The production flag has been provided to allow you to control code and configuration in production vs non-production
environments. In node, you can access this flag via `process.env.PRODUCTION`. If you have scheduled lambda
functions, you should add the following to your schedule configs to only enable the schedule in production:

```
enabled: ${env:PRODUCTION, self:custom.false}
```

##### Adding environment variables and secrets

By uncommenting the `provider.environment` option from the block at the top of the file, environment variables
will be loaded from `serverless-${Stage}.yml` files. Do *NOT* use these for storing secrets.

### Package management

If you are using Node.js with a single `package.json` at the root of the repository, you should be all set.
If you have a non-root level `package.json` or multiple `package.json`s, you will need script modifications.

### Deployment roles

If you are working in an account or region that has not been used with GitLab CI, you must do some IAM work
to get things going. There are 2 parts to doing this in a secure manner:
1. Create/update an EC2 role in the account hosting the GitLab CI runner instance.
2. Create a cross-account access role in the account hosting the deployed services.

##### The GitLab CI runner EC2 role

If the `gitlab-ci-role` EC2 role below does not exist in the account hosting the GitLab CI runner instance, create
one and attach an inline policy like the one below.

##### gitlab-ci-role inline policy
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "sts:AssumeRole",
            "Resource": [
                "arn:aws:iam::*:role/gitlab-ci-deployment"
            ]
        }
    ]
}
```

Retrieve the Role ID of this EC2 role with the following CLI command:

```
aws iam get-role --role-name gitlab-ci-role --query Role.RoleId --output text
```

Finally, create a `gitlab-ci-deployment` cross account access role in the account hosting that will
host the deployed services. This role should have the `AdministratorAccess` managed policy. In addition,
it needs to have the trust relationship policy below. Be sure to fill in the GitLab CI host account
number, the EC2 Role ID from the last step, and the GitLab CI runner's EC2 Instance ID (found in EC2
console).

##### gitlab-ci-deployment trust relationship policy document
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<GitLabCIHostAcctNumber>:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:userid": "<RoleId>:<EC2InstanceId>"
        }
      }
    }
  ]
}
```

### Important resources to add

TODO: Add links to your `.eslintrc`, common code snippets, etc.