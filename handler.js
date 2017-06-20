'use strict';

const stringify = require('json-stringify-safe');
const axios = require('axios');
const Promise = require('bluebird');
const fs = require('fs');
const groupInjectionConfigs = require('./group-injection-configs');
Promise.promisifyAll(fs);

// We need this hack to call private IP of gitlab
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

module.exports.injectBoilerplate = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.headers['X-Gitlab-Token'] !== process.env.GITLAB_SYSHOOK_TOKEN) {
    console.log('Terminating: unauthorized!');
    callback(null, { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized!' }) });
    return;
  }
  console.log('Authorized!');
  console.log(`Event: ${stringify(event)}`);

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.log(`Terminating: Unable to parse JSON body. Error: ${stringify(err)}`);
    callback(null, { statusCode: 400, body: JSON.stringify({ message:  `Unable to parse JSON body.` }) });
    return;
  }
  console.log('Parsed body!');

  // verify that it is a project create event
  if (body.event_name !== 'project_create') {
    console.log('Terminating: not a project create event!');
    callback(null, { statusCode: 200, body: JSON.stringify({ message: 'Not a project_create event. No action taken.' }) });
    return;
  }
  console.log('Working with a project create event!');

  const injectionConfig = groupInjectionConfigs.find(gic => gic.regex && gic.regex.test(body.path_with_namespace));

  if (injectionConfig.paths.length === 0) {
    console.log(`Terminating: No content to inject for files matching regex: ${injectionConfig.regex && injectionConfig.regex.toString()}`);
    callback(null, { statusCode: 200, body: JSON.stringify({ message: 'No content to inject' }) });
    return;
  }

  Promise.map(injectionConfig.paths, p => fs.readFileAsync(p.source, 'utf8')
    .then(data => ({ action: 'create', file_path: p.target, content: data })))
    .then(actions => {
      if (!process.env.PROD) {
        console.log('Terminating: non-production version does not deploy');
        callback(null, { statusCode: 200, body: JSON.stringify({ message: 'Non-production version does not deploy' }) });
      } else {
        console.log('posting commit!');
        return axios.post(
          `https://${process.env.GITLAB_INSTANCE_ADDRESS}/api/v4/projects/${body.project_id}/repository/commits`,
          {
            branch: 'master',
            commit_message: 'Injected initial repo boilerplate',
            actions
          },
          { headers: { 'PRIVATE-TOKEN': process.env.GITLAB_API_TOKEN } }
        );
      }
    }).then(response => {
      console.log(`Content injection committed successfully! Response: ${stringify(response)}`);
      callback(null, { statusCode: 200, body: JSON.stringify({ message: 'Content injection successfully!' }) });
    }).catch(err => {
      console.log(`Holy crap! Something unexpected went wrong! Error: ${stringify(err)}`);
      callback(null, { statusCode: 500, body: JSON.stringify({ message: `Holy crap! Something unexpected went wrong!` }) });
    });
};