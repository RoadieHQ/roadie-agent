import {
  AvailableAgentConfiguration,
  EntityProviderAgentConfiguration,
  TechInsightsDataSourceAgentConfiguration,
  TriggerableAgent,
} from '$/types';
import { RoadieAgentForwarder } from '@/forwarder/RoadieAgentForwarder';
import express, { Express } from 'express';
import { getLogger } from '@/logger';

export async function constructIndividualAgents(
  agentConfigurations: AvailableAgentConfiguration[],
  forwarder: RoadieAgentForwarder,
) {
  const app = express();

  app.disable('x-powered-by');
  const agents = (
    await Promise.all(
      agentConfigurations.map(async (configuration) => {
        switch (configuration.type) {
          case 'entity-provider':
            await registerEntityProvider(configuration, app, forwarder);

            break;
          case 'tech-insights-data-source':
            return await registerTechInsightsDataSource(
              configuration,
              forwarder,
            );

          case 'scaffolder-action':
            throw new Error(
              `Roadie Agent functionality of type ${configuration.type} not yet implemented.`,
            );
        }
        return;
      }),
    )
  ).filter((it) => it);

  return { app, agents: (agents as TriggerableAgent[]) ?? [] };
}

async function registerEntityProvider(
  configuration: EntityProviderAgentConfiguration,
  app: Express,
  forwarder: RoadieAgentForwarder,
) {
  const logger = getLogger('RoadieAgentForwarder_EntityProvider');

  // Specifying routes explicitly
  app.get(`/agent-provider/${configuration.name}`, async (req, res) => {
    const entityEmitter = await forwarder.createEntityEmitter({
      target: configuration.name,
    });
    logger.info(
      `Received entity emitting trigger for endpoint ${configuration.name}`,
    );
    configuration.handler(entityEmitter);
    res.send(`Triggered provider event for Roadie Agent ${configuration.name}`);
  });
}

async function registerTechInsightsDataSource(
  configuration: TechInsightsDataSourceAgentConfiguration,
  forwarder: RoadieAgentForwarder,
): Promise<TriggerableAgent> {
  const logger = getLogger('RoadieAgentForwarder_TechInsightsDataSource');
  return {
    name: configuration.name,
    type: 'tech-insights-data-source',
    trigger: async () => {
      const techInsightsFactEmitter =
        await forwarder.createTechInsightsFactEmitter({
          target: configuration.name,
        });
      logger.info(
        `Received data source emitting trigger for endpoint ${configuration.name}`,
      );
      configuration.handler(techInsightsFactEmitter);
      // TODO: return response from the endpoint to the user
      return `Triggered data source event for Roadie Agent ${configuration.name}`;
    },
  };
}
