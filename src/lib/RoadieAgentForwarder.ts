import fetch from 'node-fetch';
import { EntityProviderMutation } from '@backstage/plugin-catalog-node';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';

const AGENT_ENTITY_PROVIDER_PATH = `api/catalog/roadie-agent/`;
export class RoadieAgentForwarder {
  private readonly brokerClientUrl: string;
  private logger: BaseLogger;
  constructor({ brokerClientUrl }: { brokerClientUrl: string }) {
    this.brokerClientUrl = brokerClientUrl;
    this.logger = getLogger('RoadieAgentForwarder');
  }

  createEntityEmitter(target: string) {
    this.logger.info(`Creating new entity emitter for target ${target}`);
    return async (mutation: EntityProviderMutation) => {
      this.logger.info(`Forwarding mutation to target ${target}`);
      const url = `${this.brokerClientUrl}/${AGENT_ENTITY_PROVIDER_PATH}`;
      const body = JSON.stringify({
        target,
        payload: mutation,
      });
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      try {
        const responseBody = await response.text();
        this.logger.info(
          `Received response from forwarder mutation. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
        );
      } catch (e) {
        this.logger.warn(
          `No Response received from forwarder mutation. Status: ${response?.status}, ${response?.statusText}.`,
        );
      }
    };
  }
}
