import express, { Express } from 'express';
import {
  AvailableAgentConfiguration,
  EntityProviderAgentConfiguration,
  HandlerConfig,
  ScaffolderActionAgentConfiguration,
} from '$/types';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';
import { CustomScaffolderAction } from '@/scaffolderAction/CustomScaffolderAction';
import { createEntityEmitter } from '@/entityProvider/createEntityEmitter';
import { isActionRunning } from '@/scaffolderAction/runtimeContext';

export class RoadieAgentReceiver {
  private server: Express;
  private readonly agentConfigurations: Map<
    string,
    AvailableAgentConfiguration
  >;
  private readonly handlerConfig: HandlerConfig;
  private readonly logger: BaseLogger;
  private readonly brokerClientUrl: string;

  constructor(
    agentConfigurations: AvailableAgentConfiguration[],
    brokerClientUrl: string,
    handlerConfig: HandlerConfig,
  ) {
    this.server = this.constructRequestListener(agentConfigurations);
    this.handlerConfig = handlerConfig;
    this.brokerClientUrl = brokerClientUrl;
    this.logger = getLogger('RoadieAgentReceiver');
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
    app.use(express.json());
    app.disable('x-powered-by');
    agentConfigurations.forEach((configuration) => {
      switch (configuration.type) {
        case 'entity-provider':
          this.registerEntityProvider(configuration, app);

          break;
        case 'scaffolder-action':
          this.registerScaffolderAction(configuration, app);

          break;
        case 'tech-insights-data-source':
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
      const entityEmitter = createEntityEmitter(
        configuration.name,
        this.brokerClientUrl,
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

  private registerScaffolderAction(
    configuration: ScaffolderActionAgentConfiguration,
    app: Express,
  ) {
    // Specifying routes explicitly
    app.post(`/scaffolder-action/${configuration.name}`, (req, res) => {
      if (req.body.livenessProbe) {
        this.logger.info(`Received scaffolder action liveness probe`);
        return res.json({
          ok: isActionRunning(req.body.actionId),
        });
      }
      this.logger.info(
        `Received scaffolder action trigger for endpoint ${configuration.name}`,
      );

      const { body, getPresign, putPresign, actionId } = req.body;

      const scaffolderAction = new CustomScaffolderAction({
        configuration,
        actionId,
        brokerClientUrl: this.brokerClientUrl,
        payload: {
          body,
          getPresign,
          putPresign,
        },
      });
      void scaffolderAction.start();

      res.json({
        message: `Triggered custom scaffolder action event for Roadie Agent ${configuration.name}`,
      });
    });
  }
}
