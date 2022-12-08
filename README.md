# Roadie Agent Library

## What is Roadie Agent

Roadie Agent library is functionality utilizing Snyk Broker to achieve a secure connection between customer infrastructure and running Roadie application. It utilizes a broker connection between a Broker client initialized by the Roadie Agent and a broker server running in Roadie infrastructure.

Roadie agent relies heavily on the Snyk Broker client library in its core. The main flow of data is the same as with Snyk broker where the _Broker Client_ initiates a connection to the _Broker Server_ which is running on the Roadie instance. After the connection between the client and server is successful, data can flow securely via that connection to other destinations reachable by their respective endpoints.

The library creates a wrapper around the Snyk Broker library and uses this connection to provide users of the library the possibility to use this brokered connection to run custom agent code in their own infrastructure. That is achieved by creating an additional web server and configuring the _Broker client_ to forward all requests to this, agent embedded, webserver. This local webserver can also send specific subset of requests back via the same brokered connection, thus giving the library users a clear, secure interface they can use to provide data to a running Roadie instance.

The agent webserver runs by default in `http://localhost:7044` and has a specified set of endpoints that are initialized only based on agent configurations. All other endpoints return 404.


## Installation

1. Run `npm install @roadiehq/roadie-agent` or `yarn add @roadiehq/roadie-agent` (or equivalent) depending on your preferred choice of package manager.
2. Run `npm install` or `yarn` (or equivalent).

(With default settings) Create a folder called `config` at the root of your project and copy `provider-accept.json` file from the installed packages config folder into it. Alternatively the default configuration can be copy-pasted from below:
<details>

<summary>Click to expand</summary>


```json
{
  "private": [
    {
      "method": "GET",
      "path": "/agent-provider/*",
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


