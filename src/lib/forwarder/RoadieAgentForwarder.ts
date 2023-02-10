import fetch from 'node-fetch';
import { EntityProviderMutation } from '@backstage/plugin-catalog-node';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';
import { TechInsightFact } from '@backstage/plugin-tech-insights-node';

const ENTITY_PROVIDER_PATH = `api/catalog/roadie-agent/`;
const TECH_INSIGHTS_FACT_EMITTER_PATH = `api/tech-insights/roadie-agent/emit-facts`;

type EmitterOptions = {
  target: string;
};

export class RoadieAgentForwarder {
  private readonly brokerClientUrl: string;
  private logger: BaseLogger;
  constructor({ brokerClientUrl }: { brokerClientUrl: string }) {
    this.brokerClientUrl = brokerClientUrl;
    this.logger = getLogger('RoadieAgentForwarder');
  }

  async createEntityEmitter({ target }: { target: string }) {
    this.logger.info(`Creating new entity emitter for target ${target}`);
    return async (mutation: EntityProviderMutation) => {
      this.logger.info(`Forwarding mutation to target ${target}`);
      const url = `${this.brokerClientUrl}/${ENTITY_PROVIDER_PATH}`;
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
      const responseBody = await response.text();
      this.logger.info(
        `Received response from forwarder mutation. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
      );
    };
  }

  async createTechInsightsFactEmitter({ target }: EmitterOptions) {
    this.logger.info(
      `Creating new tech insights fact emitter for target ${target}`,
    );
    return async (techInsightFacts: TechInsightFact[]) => {
      this.logger.info(`Forwarding tech insights data to target ${target}`);
      const url = `${this.brokerClientUrl}/${TECH_INSIGHTS_FACT_EMITTER_PATH}`;
      const body = JSON.stringify({
        target,
        payload: techInsightFacts,
      });
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseBody = await response.text();
      this.logger.info(
        `Received response from tech insights data source. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
      );
    };
  }
}
