# This a WIP awsv4 signing implementation for k6

This tries to reimplement AWS v4 signing using k6 crypto library.

The idea behind this was born as people were using the aws js sdk which is a hot 1.9mb minified which given that k6 has to load it once per each VU is not great.

Additionally it couldn't use the `k6/crypto` package which meant it was slow. And as a whole there are no guarantees that it will work.

Until v3 it also wasn't modular so you needed to get the whole thing even if you wanted to make a single call.

This repo tries to have all the necessary crypto stuff in the `core.js` file and have a file with some helper functions per service in the other files. This obviously means that a user has really good chances of having to write their own helper functions as calling something like singWithHeaders by hand is in general pretty hard

## Usage (WIP)

You need to have set the variables  `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID` as env variables (you can do it with the `-e` flag as well). Call the appropriate `signWithHeaders` or `createPresignedURL`. The later is only used for s3 get requests from what I know.

The appropriate call and what the arguments need to be is dependant on the call and will require reading the AWS documentation and probably googling for someone doing it with either pure `curl` or some other method not using the `aws` sdk as there are always gotchas in my experience.

## TODO
- Document the current support
- Test the current support better
- Make better abstraction - currently a user needs to provide every parameter always
- To the above, make it easier to not use env variables for the AWS secret and key
- Add additional helpers for additional services

## References

- https://docs.aws.amazon.com/sagemaker/latest/APIReference/CommonParameters.html
- https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
