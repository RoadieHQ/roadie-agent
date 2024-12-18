import { AGENT_ENTITY_PROVIDER_PATH } from '@/entityProvider/constants';
import fetch from 'node-fetch';
import { getLogger } from '@/logger';
import { EntityProviderMutation } from '$/types';

export const createEntityEmitter = (
  target: string,
  brokerClientUrl: string,
) => {
  const logger = getLogger('RoadieAgentEntityEmitter');

  logger.info(`Creating new entity emitter for target ${target}`);
  return async (mutation: EntityProviderMutation) => {
    logger.info(`Forwarding mutation to target ${target}`);
    const url = `${brokerClientUrl}/${AGENT_ENTITY_PROVIDER_PATH}`;
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
      logger.info(
        `Received response from forwarder mutation. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
      );
    } catch (e) {
      logger.warn(
        `No Response received from forwarder mutation. Status: ${response?.status}, ${response?.statusText}.`,
      );
    }
  };
};
