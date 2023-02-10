import {
  AvailableAgentConfiguration,
  EntityProviderAgentConfiguration,
  TechInsightsDataSourceAgentConfiguration,
} from '$/types';
import { RoadieAgentForwarder } from '@/forwarder/RoadieAgentForwarder';
import express, { Express } from 'express';
import { getLogger } from '@/logger';

export async function constructRequestListeners(
  agentConfigurations: AvailableAgentConfiguration[],
  forwarder: RoadieAgentForwarder,
) {
  const app = express();

  app.disable('x-powered-by');
  await Promise.all(
    agentConfigurations.map(async (configuration) => {
      switch (configuration.type) {
        case 'entity-provider':
          await registerEntityProvider(configuration, app, forwarder);

          break;
        case 'tech-insights-data-source':
          await registerTechInsightsDataSource(configuration, app, forwarder);
          break;

        case 'scaffolder-action':
          throw new Error(
            `Roadie Agent functionality of type ${configuration.type} not yet implemented.`,
          );
      }
      return;
    }),
  );

  return app;
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
  app: Express,
  forwarder: RoadieAgentForwarder,
) {
  const logger = getLogger('RoadieAgentForwarder_TechInsightsDataSource');

  // Specifying routes explicitly
  app.get(`/agent-data-source/${configuration.name}`, async (req, res) => {
    const techInsightsFactEmitter =
      await forwarder.createTechInsightsFactEmitter({
        target: configuration.name,
      });
    logger.info(
      `Received entity emitting trigger for endpoint ${configuration.name}`,
    );
    configuration.handler(techInsightsFactEmitter);
    res.send(`Triggered provider event for Roadie Agent ${configuration.name}`);
  });
}
