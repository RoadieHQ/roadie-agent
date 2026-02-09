import { EntityProviderMutation } from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import * as nodeFetchModule from 'node-fetch';
import sinon from 'sinon';
import { createEntityEmitter } from '@/entityProvider/createEntityEmitter';

const entity: Entity = {
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
  },
};
const fakePayload: EntityProviderMutation = {
  type: 'full' as const,
  entities: [
    {
      entity,
    },
  ],
};

describe('EntityProvider.entityEmitter', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should emit entity when triggered', async () => {
    const fetchStub = sinon.stub(nodeFetchModule, 'default');
    const connectionToken = 'my-target-broker-connection';
    const brokerClientUrl = 'http://local.host';

    const emitter = createEntityEmitter(connectionToken, brokerClientUrl);
    await emitter(fakePayload);
    sinon.assert.calledOnce(fetchStub);
    sinon.assert.calledWith(
      fetchStub,
      'http://local.host/api/catalog/roadie-agent/',
      sinon.match({
        method: 'POST',
        body: JSON.stringify({
          target: connectionToken,
          payload: fakePayload,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
