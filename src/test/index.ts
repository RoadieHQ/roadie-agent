import { createRoadieAgentEntityProvider } from '@/entityProviderAgent';
import { RoadieAgent } from '@/RoadieAgent';
import { expect } from 'chai';

const fakePayload = {
  type: 'full' as const,
  entities: [
    {
      entity: {
        metadata: {
          namespace: 'default',
          annotations: {},
          name: 'locally-provided-entity',
          title: 'Locally provided entity',
          description:
            'Entity that is provided via Broker connection from an entity provider running on a separate machine',
        },
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        spec: {
          type: 'team',
          profile: {
            displayName: 'Locally provided entity',
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

describe('Roadie Agent', function () {
  it('should create working connection to Roadie instance', function () {
    /*
  This starts the full Roadie Agent server and will run forever. Used for development testing.

 RoadieAgent.fromConfig()
      .addEntityProvider(
        createRoadieAgentEntityProvider({
          name: 'testprovider',
          handler: async (emit) => {
            await emit(fakePayload);
          },
        }),
      )
      .start();
      */
  });
});
