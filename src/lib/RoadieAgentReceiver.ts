import express, { Express } from 'express';
import {
  AvailableAgentConfiguration,
  EntityProviderAgentConfiguration,
  HandlerConfig,
} from '$/types';
import { RoadieAgentForwarder } from '@/RoadieAgentForwarder';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';

export class RoadieAgentReceiver {
  private server: Express;
  private agentConfigurations: Map<string, AvailableAgentConfiguration>;
  private handlerConfig: HandlerConfig;
  private forwarder: RoadieAgentForwarder;
  private logger: BaseLogger;

  constructor(
    agentConfigurations: AvailableAgentConfiguration[],
    forwarder: RoadieAgentForwarder,
    handlerConfig: HandlerConfig,
  ) {
    this.server = this.constructRequestListener(agentConfigurations);
    this.handlerConfig = handlerConfig;
    this.forwarder = forwarder;
    this.logger = getLogger('RoadieAgentForwarder');
    this.agentConfigurations = agentConfigurations.reduce(
      (acc, agentConfiguration) => {
        acc.set(agentConfiguration.name, agentConfiguration);
        return acc;
      },
      new Map<string, AvailableAgentConfiguration>(),
    );
  }
  start() {
    this.logger.info('Starting Roadie Agent Receiver webserver');
    this.server.listen(this.handlerConfig.port);
  }

  constructRequestListener(agentConfigurations: AvailableAgentConfiguration[]) {
    const app = express();

    app.disable('x-powered-by');
    agentConfigurations.forEach((configuration) => {
      switch (configuration.type) {
        case 'entity-provider':
          this.registerEntityProvider(configuration, app);

          break;
        case 'tech-insights-data-source':
        case 'scaffolder-action':
          throw new Error(
            `Roadie Agent functionality of type ${configuration.type} not yet implemented.`,
          );
      }
    });

    return app;
  }

  private registerEntityProvider(
    configuration: EntityProviderAgentConfiguration,
    app: Express,
  ) {
    // Specifying routes explicitly
    app.get(`/agent-provider/${configuration.name}`, (req, res) => {
      const entityEmitter = this.forwarder.createEntityEmitter(
        configuration.name,
      );
      this.logger.info(
        `Received entity emitting trigger for endpoint ${configuration.name}`,
      );
      configuration.handler(entityEmitter);
      res.send(
        `Triggered provider event for Roadie Agent ${configuration.name}`,
      );
    });
  }
}
