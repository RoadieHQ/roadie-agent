import fetch from 'node-fetch';
import { EntityProviderMutation } from '@backstage/plugin-catalog-node';

const AGENT_ENTITY_PROVIDER_PATH = `api/catalog/roadie-agent/`;
export class RoadieAgentForwarder {
  private readonly brokerClientUrl: string;
  constructor({ brokerClientUrl }: { brokerClientUrl: string }) {
    this.brokerClientUrl = brokerClientUrl;
  }

  createEntityEmitter(target: string) {
    return async (mutation: EntityProviderMutation) => {
      console.log(`Forwarding mutation to target ${target}`);

      const url = `${this.brokerClientUrl}/${AGENT_ENTITY_PROVIDER_PATH}`;
      const body = JSON.stringify({
        target,
        payload: mutation,
      });
      await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };
  }
}
