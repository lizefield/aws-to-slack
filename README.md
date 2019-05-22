# Check AWS Billing

## Envs
SLACK_URL : String  
SLACK_TOKEN : String  
SLACK_CHANNEL : String  

## Setup

ライブラリのインストール

`
yarn
`

資材の圧縮

`
zip -r billing.zip ./* -x ".git"
`

zipの内容確認

`
cd .. && zipinfo billing.zip
`
