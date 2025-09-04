# Roadie Agent Library

This repository houses the Roadie Agent as well as dockerfiles for the Snyk Broker configured for different third party services which are published to DockerHub.

## What is Roadie Agent

Roadie Agent library is functionality utilizing Snyk Broker to achieve a secure connection between customer infrastructure and running Roadie application. It utilizes a broker connection between a Broker client initialized by the Roadie Agent and a broker server running in Roadie infrastructure.

Roadie agent relies heavily on the Snyk Broker client library in its core. The main flow of data is the same as with Snyk broker where the _Broker Client_ initiates a connection to the _Broker Server_ which is running on the Roadie instance. After the connection between the client and server is successful, data can flow securely via that connection to other destinations reachable by their respective endpoints.

The library creates a wrapper around the Snyk Broker library and uses this connection to provide users of the library the possibility to use this brokered connection to run custom agent code in their own infrastructure. That is achieved by creating an additional web server and configuring the _Broker client_ to forward all requests to this, agent embedded, webserver. This local webserver can also send specific subset of requests back via the same brokered connection, thus giving the library users a clear, secure interface they can use to provide data to a running Roadie instance.

The agent webserver runs by default in `http://localhost:7044` and has a specified set of endpoints that are initialized only based on agent configurations. All other endpoints return 404.


## Installation

1. Run `npm install @roadiehq/roadie-agent` or `yarn add @roadiehq/roadie-agent` (or equivalent) depending on your preferred choice of package manager.
2. Run `npm install` or `yarn` (or equivalent).
3. Copy `config.default.json` file from the installed packages config folder into the root of your application. Alternatively the default configuration can be copy-pasted from below:
    <details>

    <summary>Click to expand</summary>

    ```json
    {
      "REMOTE_WORKLOAD_NAME":"BrokerWorkload",
      "REMOTE_WORKLOAD_MODULE_PATH":"../broker-workload/websocketRequests",
      "CONNECTIONS_MANAGER": {
        "watcher": {
          "interval": 60000
        }
      },
      "BROKER_SERVER_UNIVERSAL_CONFIG_ENABLED": false,
      "BROKER_CLIENT_CONFIGURATION": {},
      "FILTER_RULES_PATHS": {}
    }
    
    ```
    
    </details>

4. (With default settings) Create a folder called `config` at the root of your project and copy `accept.json` file from the installed packages config folder into it. Alternatively the default configuration can be copy-pasted from below:
    <details>
    
    <summary>Click to expand</summary>
    
    ```json
    {
      "private": [
        {
          "method": "GET",
          "path": "/agent-provider/*",
          "origin": "http://localhost:7044"
        }  ,
        {
          "method": "POST",
          "path": "/scaffolder-action/*",
          "origin": "http://localhost:7044"
        }
      ],
      "public": [
        {
          "method": "any",
          "path": "/*"
        }
      ]
    }
    ```
    
    </details>

## Usage

Standard use case is to use the agent as a library. The minimal example to get started below:

```javascript

// myfile.js
const { RoadieAgent, createRoadieAgentEntityProvider } = require('@roadiehq/roadie-agent')
const myEntityProviderHandler = require('./myEntityProvider')

RoadieAgent.fromConfig()
  .addEntityProvider(
    createRoadieAgentEntityProvider({
      name: 'testprovider',
      handler: myEntityProviderHandler
    }),
  )
  // Add second entity provider
  // .addEntityProvider(...)   
  
  // Add a custom scaffolder action
  // .addScaffolderAction(...) 
  .start();

```

And then running the file with `node myfile.js`

### Configuration options

In reality the Agent initialization call needs some configuration items to work correctly.

| Config name | Default               | Description                                                                                                     |
|-------------|-----------------------|-----------------------------------------------------------------------------------------------------------------|
| server      | http://localhost:7341 | Broker server URL. This will usually be something like `https://<tenant-name>.broker.roadie.so`                 |
| identifier  | example               | Identifier of the broker client-server connection, also known as broker token. This can be arbitrarily chosen.  |
| port        | 7342                  | Port to use for the local broker client receiver web server                                                     |
| agentPort   | 7044                  | Port to use for the local Roadie Agent that handles events brokered via the broker client                       |
| accept      | config/accept.json    | Path to the broker client accept file to use                                                                    |


<details>

<summary>See example</summary>


```js
RoadieAgent.fromConfig({
      server: 'https://myroadie.broker.roadie.so',
      identifier: 'my-dev-cluster-roadie-agent',
      accept: '/etc/config/my-modified-accept.json',
   })
  .addEntityProvider(
    createRoadieAgentEntityProvider({
      name: 'testprovider',
      handler: myEntityProviderHandler
    }),
  )
  .start();
```
</details>

### Handler types

#### Custom Scaffolder Action

The Custom Scaffolder Action agent library allows you to run self-hosted Scaffolder actions on your Roadie instance. The library takes care of establishing a secure communication channel to your Roadie server, to receiving and triggering your custom action logic, and to handle the sharing of workspace and related files between the Roadie hosted builtin actions and your self-hosted Custom Actions. 

You can create a Roadie Agent driven Custom Scaffolder actions by using the `createRoadieAgentScaffolderAction` helper function. This function expects two arguments, one naming the action itself and a handler to provide the actual custom action logic. Note that the `name` defined in here **needs to match** the one configured in your Roadie instance.

Custom Scaffolder Action handler is a function that receives a `context` callback. This callback contains information about the `payload` appended to the template when run on Roadie, the location of the possible `workspacePath` which has been transferred from Roadie Scaffolder Task to your local Custom Action location and a `log` function which can be used to inform the running Scaffolder Action in Roadie to log events for the end user. You can see the type definition below.  

<details>
<summary>Show type</summary>

```typescript
export interface ScaffolderActionContext {
  log: (content: string, context?: Record<string, string>) => Promise<void>; 
  workspacePath: string;
  payload: { body: Record<string, string> };
}
```
</details>

You can initialize a Custom Scaffolder Action by configuring the name and handler function, along with the needed connection parameters to your Roadie Broker URL. 


<details>
<summary>Show Example Custom Scaffolder Action</summary>

```javascript
// my-action.js
import { RoadieAgent, createRoadieAgentScaffolderAction } from '@roadiehq/roadie-agent';
import fs from 'fs';

const config = {
  server: 'https://my-roadie-instance.broker.roadie.so',
  identifier: 'roadie-custom-action-token',
};

RoadieAgent.fromConfig(config)
  .addScaffolderAction(
    createRoadieAgentScaffolderAction({
      name: 'test-action', // The name of the action as defined in Roadie
      handler: async (ctx) => {
        try {
          fs.writeFileSync(
            `${ctx.workspacePath}/test.txt`,
            'new file with new contents',
          ); 
          // Writing a new file into the shared workspace
        } catch (err) {
          console.error(err);  // Local logging on the Roadie Agent process
        }

        let count = 0;
        while (count < 5) {  // Additional other actions that is wanted to be taken. This time looping for 5 seconds
          await new Promise((resolve) => setTimeout(resolve, 1000));
          count++;
          await ctx.log(`hello world`); // Sending a log message to be displayed to the end user
        } 
      },
    }),
  )
  // Add a second custom scaffolder action
  // .addScaffolderAction(...) 
  .start();

```
</details>

You can run this single file with a command `node my-action.js` after you have installed the needed dependencies for the project. 


#### Entity Provider

You can create a Roadie Agent driven Entity Provider by using the `createRoadieAgentEntityProvider` helper function. This function expects two arguments, one naming the agent itself and a handler to provide the actual entities. Note that the `name` defined in here **needs to match** the one configured in your Roadie instance 

Entity provider handler is a function that receives an `emit` callback. This callback can be called to emit new entity mutations to your Roadie instance. The shape of the payload to be emitted is based on `EntityProviderMutation` type defined in `@backstage/plugin-catalog-node` package. 
<details>
<summary>Show type</summary>

```typescript
export declare type EntityProviderMutation = {
    type: 'full';
    entities: DeferredEntity[];
} | {
    type: 'delta';
    added: DeferredEntity[];
    removed: DeferredEntity[];
};

export declare type DeferredEntity = {
  entity: Entity;
  locationKey?: string;
};
```
</details>


Example entity provider with a hardcoded entity definition would look like the following:

<details>
<summary>Show example hardcoded entity handler</summary>


```typescript
const fakePayload = {
  type: 'full',
  entities: [
    {
      entity: {
        metadata: {
          namespace: 'default',
          annotations: {},
          name: 'locally-provided-group-entity',
          title: 'Locally provided entity',
          description:
            'Entity that is provided via Broker connection from an entity provider running on a separate machine',
        },
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        spec: {
          type: 'team',
          profile: {
            displayName: 'Locally provided group entity',
            email: 'team-alpha@example.com',
            picture:
              'https://avatars.dicebear.com/api/identicon/team-alpha@example.com.svg?background=%23fff&margin=25',
          },
          children: [],
        },
      },
    },
  ],
};

const myEntityHandler = async (emit) => {
  await emit(fakePayload);
}
```
</details>


