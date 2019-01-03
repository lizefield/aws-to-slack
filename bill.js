const SLACK_URL         = process.env['SLACK_URL'];
const SLACK_TOKEN       = process.env['SLACK_TOKEN'];
const SLACK_CHANNEL     = process.env['SLACK_CHANNEL'];

const aws = require('aws-sdk');
const cloudWatch = new aws.CloudWatch({region: 'us-east-1', endpoint: 'https://monitoring.us-east-1.amazonaws.com'});
const fetch = require('node-fetch');

let billings = {};
let services = ['AmazonEC2', 'AmazonRDS', 'AmazonRoute53', 'AmazonS3', 'AmazonSNS', 'AWSDataTransfer', 'AWSLambda', 'AWSQueueService'];

const floatFormat = (number, n) => {
  const _pow = Math.pow(10 , n) ;
  return Math.round(number * _pow)  / _pow;
}

const sendSlack = async () => {
  let fields = [];

  for (let service in billings) {
    fields.push({
      title: service,
      value: floatFormat(billings[service], 2) + " USD",
      short: true
    });
  }

  let message = {
    channel: SLACK_CHANNEL,
    attachments: [{
      fallback: '今月のAWSの利用費は、' + floatFormat(billings['Total'], 2) + ' USDです。',
      pretext: '今月のAWSの利用費は…',
      color: 'good',
      fields: fields
    }]
  };

  // slackにpost
  try {
    const response = await fetch(SLACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_TOKEN}`
      },
      body: JSON.stringify(message)
    });
    const json = await response.json();
  } catch (error) {
    console.error(error);
  }
}

const getEachServiceBilling = (params, service=null) => {
  const label = (service) ? service : 'Total';

  if (service) {
    params.Dimensions = [
      {
        Name: 'Currency',
        Value: 'USD'
      },
      {
        Name: 'service',
        Value: service
      }
    ]
  }

  cloudWatch.getMetricStatistics(params, (err, data) => {
    if (err) {
      console.error(err, err.stack);
    } else {
      const datapoints = data['Datapoints'];

      if (datapoints.length < 1) {
        billings[label] = 0;
      } else {
        billings[label] = datapoints[datapoints.length - 1]['Average']
      }

      if (services.length > 0) {
        service = services.shift();
        getEachServiceBilling(params, service);
      } else {
        sendSlack();
      }
    }
  });
}

const getBilling = (context) => {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1,  0,  0,  0);
  const endTime   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

  let params = {
    MetricName: 'EstimatedCharges',
    Namespace: 'AWS/Billing',
    Period: 86400,
    StartTime: startTime,
    EndTime: endTime,
    Statistics: ['Average'],
    Dimensions: [
      {
        Name: 'Currency',
        Value: 'USD'
      }
    ]
  };

  getEachServiceBilling(params);
}

exports.handler = (event) => {
  getBilling();
};
